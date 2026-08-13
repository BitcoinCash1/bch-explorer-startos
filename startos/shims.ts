/**
 * Runtime patches applied to the prebuilt explorer images before their daemons
 * start. The frontend and backend images are published upstream and cannot be
 * rebuilt from here, so each fix is applied in place at start.
 *
 * Every backend patch is a regex replacement that no-ops when its pattern is
 * absent, so one upstream has since made unnecessary costs nothing.
 */

/**
 * Node-compatibility patches for the backend, plus three fixes that apply to
 * every backend:
 *
 * - `getblock(verbosity=2)` returns `rawtx`, not `tx`
 * - `getblock` omits `nTx`; derive `tx_count` from the tx array length
 * - `getblockstats` is unimplemented (-32601); fall back to the explorer's own
 *   local stats computation
 * - `getrawtransaction` takes `(txid, verbose)`, not the four-parameter form
 * - `getindexinfo` is BCHN-only; return `{}` so the indexer skips BCHN indexes
 * - `getchaintips` is unimplemented; return `[]` so orphan tracking no-ops
 * - `validateaddress` omits `scriptPubKey`, which the Electrum scripthash path
 *   needs — install a cashaddr → scriptPubKey decoder and wrap it
 * - `getrawmempool` / `getmempoolinfo` entries lack the fields the frontend
 *   reads (`vsize`, `fees.base`, ancestor/descendant counts, `feePerSize`)
 * - `websocket-handler` drops `bytesPerSecond=0` from the init payload on a
 *   truthy check, so a quiet mempool leaves Minimum fee, Unconfirmed, Memory
 *   Usage and Incoming Transactions stuck on their loading placeholders
 * - `blocks.tx_count` is `smallint unsigned` (max 65535) but BCH blocks exceed
 *   that, so the miner indexer retries an out-of-range INSERT forever and every
 *   indexed-state widget stays blank. Widen it for fresh installs, and force an
 *   idempotent ALTER for installs already past that migration
 * - `statistics.js` filters the mempool by truthy `feePerSize`, dropping
 *   zero-fee transactions
 */
export const backendCompatPatch = `const fs=require('fs');
function p(file,re,s){const c=fs.readFileSync(file,'utf8');const n=c.replace(re,s);if(c!==n){fs.writeFileSync(file,n);console.log('[compat-shim] patched',file);} else {console.log('[compat-shim] no-op',file);} }
p('/backend/package/api/blocks.js',
  /const verboseBlock = await bitcoin_client_1\\.default\\.getBlock\\(blockHash, 2\\);/,
  'const verboseBlock = await bitcoin_client_1.default.getBlock(blockHash, 2); verboseBlock.tx = verboseBlock.tx || verboseBlock.rawtx || [];');
p('/backend/package/api/blocks.js',
  /if \\(!block\\.stale\\) \\{\\s*return bitcoin_client_1\\.default\\.getBlockStats\\(block\\.id\\);\\s*\\}/,
  "if (!block.stale) {\\n            try { return await bitcoin_client_1.default.getBlockStats(block.id); }\\n            catch (e) { const m=((e&&e.message)||'')+''; const c=e&&e.code; if (c!==-32601 && !/method not found/i.test(m)) throw e; /* [compat-shim] getblockstats unsupported; computing locally (silenced to avoid log spam during indexing) */ }\\n        }");
p('/backend/package/api/bitcoin/bitcoin-api.js',
  /\\.getRawTransaction\\(txId, 2, '', true\\)/,
  '.getRawTransaction(txId, true)');
p('/backend/package/api/bitcoin/bitcoin-api.js',
  /tx_count: block\\.nTx,/,
  'tx_count: (block.nTx != null ? block.nTx : ((block.tx && block.tx.length) || (block.rawtx && block.rawtx.length) || 0)),');
p('/backend/package/api/bitcoin/bitcoin-api.js',
  /if \\(e\\.message\\.startsWith\\('The genesis block coinbase'\\)\\)/,
  "if (e && e.message && e.message.startsWith('The genesis block coinbase'))");
p('/backend/package/api/bitcoin/bitcoin-api.js',
  /scriptpubkey: vout\\.scriptPubKey\\.hex,/,
  'scriptpubkey: (vout.scriptPubKey && vout.scriptPubKey.hex) || "",');
p('/backend/package/api/bitcoin/bitcoin-api.js',
  /this\\.translateScriptPubKeyType\\(vout\\.scriptPubKey\\.type\\)/,
  'this.translateScriptPubKeyType((vout.scriptPubKey && vout.scriptPubKey.type) || "")');
p('/backend/package/api/bitcoin/bitcoin-api.js',
  /if \\(transaction\\.vin\\[0\\]\\.is_coinbase\\) \\{/,
  'if (!transaction.vin || !transaction.vin[0] || transaction.vin[0].is_coinbase) {');
p('/backend/package/api/bitcoin/bitcoin-api.js',
  /const innerTx = \\(await this\\.\\$getRawTransaction\\(transaction\\.vin\\[i\\]\\.txid, false, false\\)\\);\\s*transaction\\.vin\\[i\\]\\.prevout = innerTx\\.vout\\[transaction\\.vin\\[i\\]\\.vout\\];\\s*transaction_utils_1\\.default\\.addInnerScriptsToVin\\(transaction\\.vin\\[i\\]\\);\\s*totalIn \\+= innerTx\\.vout\\[transaction\\.vin\\[i\\]\\.vout\\]\\.value;/,
  'try { const innerTx = (await this.$getRawTransaction(transaction.vin[i].txid, false, false)); const po = innerTx && innerTx.vout ? innerTx.vout[transaction.vin[i].vout] : null; transaction.vin[i].prevout = po; transaction_utils_1.default.addInnerScriptsToVin(transaction.vin[i]); if (po && po.value != null) totalIn += po.value; } catch (eFee) { console.warn("[address-txs] fee-prevout skip", transaction.vin[i] && transaction.vin[i].txid, (eFee && eFee.message) || eFee); }');
p('/backend/package/api/bitcoin/electrum-api.js',
  /const tx = \\(await this\\.\\$getRawTransaction\\(history\\[i\\]\\.tx_hash, false, true\\)\\);\\s*transactions\\.push\\(tx\\);/g,
  'try { const tx = (await this.$getRawTransaction(history[i].tx_hash, false, true)); transactions.push(tx); } catch (eTx) { console.warn("[address-txs] skip", history[i] && history[i].tx_hash, (eTx && eTx.message) || eTx); }');
p('/backend/package/api/bitcoin/bitcoin.routes.js',
  /\\(0, api_1\\.handleError\\)\\(req, res, 500, 'Failed to get address transactions'\\);/,
  "console.error('[address-txs]', req.params && req.params.address, e && (e.stack || e.message || e)); (0, api_1.handleError)(req, res, 500, 'Failed to get address transactions');");
p('/backend/package/indexer.js',
  /const indexes = await bitcoin_client_1\\.default\\.getIndexInfo\\(\\);/,
  "let indexes; try { indexes = await bitcoin_client_1.default.getIndexInfo(); } catch (e) { const m=((e&&e.message)||'')+''; const c=e&&e.code; if (c!==-32601 && !/method not found|unimplemented/i.test(m)) throw e; console.warn('[compat-shim] getindexinfo unsupported; assuming no BCHN indexes'); indexes = {}; }");
p('/backend/package/api/chain-tips.js',
  /this\\.chainTips = await bitcoin_client_1\\.default\\.getChainTips\\(\\);/,
  "try { this.chainTips = await bitcoin_client_1.default.getChainTips(); } catch (e) { const m=((e&&e.message)||'')+''; const c=e&&e.code; if (c!==-32601 && !/method not found|unimplemented/i.test(m)) throw e; if (!global.__shimChainTipsLogged) { console.warn('[compat-shim] getchaintips unsupported; orphan tracking disabled (logged once)'); global.__shimChainTipsLogged = true; } this.chainTips = []; }");
const SHIM = "module.exports=function(t){if(t.__cashaddrShim)return;t.__cashaddrShim=true;const o=t.validateAddress.bind(t);const C='qpzry9x8gf2tvdw0s3jn54khce6mua7l';function decCA(a){try{const i=a.indexOf(':');const p=(i>=0?a.slice(i+1):a).toLowerCase();const d=[];for(const c of p){const v=C.indexOf(c);if(v<0)return null;d.push(v);}if(d.length<9)return null;const p5=d.slice(0,d.length-8);let ac=0,b=0;const out=[];for(const v of p5){ac=((ac<<5)|v)&0xffff;b+=5;if(b>=8){b-=8;out.push((ac>>b)&0xff);}}if(!out.length)return null;const ver=out[0],ty=(ver>>3)&0x1f,h=out.slice(1);const hx=h.map(x=>x.toString(16).padStart(2,'0')).join('');if((ty===0||ty===2)&&h.length===20)return '76a914'+hx+'88ac';if((ty===1||ty===3)&&h.length===20)return 'a914'+hx+'87';if((ty===1||ty===3)&&h.length===32)return 'aa20'+hx+'87';return null;}catch(e){return null;}}const B='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';function decLG(a){try{let n=0n;for(const c of a){const v=B.indexOf(c);if(v<0)return null;n=n*58n+BigInt(v);}let hex=n.toString(16);if(hex.length%2)hex='0'+hex;const by=[];for(let i=0;i<hex.length;i+=2)by.push(parseInt(hex.substr(i,2),16));for(const c of a){if(c==='1')by.unshift(0);else break;}if(by.length!==25)return null;const v=by[0],hx=by.slice(1,21).map(x=>x.toString(16).padStart(2,'0')).join('');if(v===0)return '76a914'+hx+'88ac';if(v===5)return 'a914'+hx+'87';return null;}catch(e){return null;}}t.validateAddress=async function(a){const x=(await o(a))||{};if(x.isvalid&&!x.scriptPubKey){const s=decCA(x.address||a)||decLG(x.address||a);if(s)x.scriptPubKey=s;}if(!x.isvalid){const s=decCA(a)||decLG(a);if(s){x.isvalid=true;x.address=x.address||a;x.scriptPubKey=s;}}return x;};const omi=t.getMempoolInfo&&t.getMempoolInfo.bind(t);if(omi){t.getMempoolInfo=async function(){const r=await omi();if(!r)return r;const sz=r.size||0,by=r.bytes||0;if(r.usage==null)r.usage=by*3;if(r.maxmempool==null)r.maxmempool=300000000;if(r.mempoolminfee==null)r.mempoolminfee=0.00001;if(r.minrelaytxfee==null)r.minrelaytxfee=0.00001;if(r.total_fee==null)r.total_fee=0;if(r.loaded==null)r.loaded=true;return r;};}const orm=t.getRawMemPool&&t.getRawMemPool.bind(t);if(orm){t.getRawMemPool=async function(verbose){const r=await orm(verbose);if(!verbose||!r||typeof r!=='object'||Array.isArray(r))return r;for(const k in r){const e=r[k];if(!e||typeof e!=='object')continue;const fee=typeof e.fee==='number'?e.fee:0;const sz=e.size||0;if(e.feePerSize==null){e.feePerSize=sz>0?(fee*1e8/sz):0;}if(e.vsize==null)e.vsize=sz;if(!e.fees||typeof e.fees!=='object')e.fees={base:fee,modified:fee,ancestor:fee,descendant:fee};const dep=Array.isArray(e.depends)?e.depends:[];if(e.ancestorcount==null)e.ancestorcount=dep.length+1;if(e.descendantcount==null)e.descendantcount=1;if(e.ancestorsize==null)e.ancestorsize=sz;if(e.descendantsize==null)e.descendantsize=sz;if(e.wtxid==null)e.wtxid=k;if(!Array.isArray(e.spentby))e.spentby=[];}return r;};}const ogme=t.getMempoolEntry&&t.getMempoolEntry.bind(t);let _meCache=null;let _meCacheTime=0;let _meCacheP=null;t.getMempoolEntry=async function(txid){if(ogme){try{return await ogme(txid);}catch(e){}}const now=Date.now();if(!_meCache||now-_meCacheTime>30000){if(!_meCacheP){_meCacheP=t.getRawMemPool(true).then(r=>{_meCache=r;_meCacheTime=Date.now();_meCacheP=null;return r;});}await _meCacheP;}if(_meCache&&_meCache[txid])return _meCache[txid];return{fees:{base:0,modified:0,ancestor:0,descendant:0},size:0,fee:0,vsize:0};};};";
fs.writeFileSync('/backend/package/api/bitcoin/cashaddr-shim.js', SHIM);
{ const f='/backend/package/api/bitcoin/bitcoin-client.js'; const c=fs.readFileSync(f,'utf8'); if(!c.includes('cashaddr-shim')){ fs.writeFileSync(f, c + "\\nrequire('./cashaddr-shim')(exports.default);\\n"); console.log('[compat-shim] compat-shim installed (cashaddr+mempool)'); } else { console.log('[compat-shim] compat-shim no-op'); } }
p('/backend/package/api/websocket-handler.js',
  /if \\(data\\[property\\]\\) \\{/,
  'if (data[property] != null) {');
p('/backend/package/api/database-migration.js',
  /tx_count\` smallint unsigned/g,
  'tx_count\` int unsigned');
p('/backend/package/api/database-migration.js',
  /async \\$initializeOrMigrateDatabase\\(\\) \\{\\s*logger_1\\.default\\.debug\\('MIGRATIONS: Running migrations'\\);/,
  "async $initializeOrMigrateDatabase() { logger_1.default.debug('MIGRATIONS: Running migrations'); try { await database_1.default.query('ALTER TABLE blocks MODIFY \`tx_count\` int unsigned NOT NULL DEFAULT 0'); } catch (e) { /* table may not exist yet on first run; smallint→int alter is idempotent and harmless to retry */ }");
p('/backend/package/api/statistics/statistics.js',
  /memPoolArray\\.filter\\(\\(tx\\) => tx\\.feePerSize\\)/,
  'memPoolArray.filter((tx) => tx.feePerSize != null)');`

/**
 * Flowee's `getblock` / `getrawtransaction` accept only a boolean verbose flag,
 * not Core's integer verbosity levels or extra parameters. Patching
 * `Client.prototype` at require time fixes every call site at once; for
 * verbosity 2 each transaction is hydrated with `getRawTransaction`.
 *
 * Loaded through `NODE_OPTIONS=--require`, so it is written to the cache volume
 * rather than into the image.
 */
export const floweeRequireHook = `(function(){var coinbaseTxids=new Set();try{var m=require('/backend/package/rpc-api/index'),C=m.Client;if(C.prototype.__floweePatched)return;C.prototype.__floweePatched=true;var _gb=C.prototype.getBlock;C.prototype.getBlock=function(hash,verbosity,patterns){var flv=(verbosity===0||verbosity===false)?false:true,needHydrate=(verbosity===2),self=this,p=_gb.call(self,hash,flv);if(!needHydrate)return p;return p.then(function(b){if(!b||!Array.isArray(b.tx)||!b.tx.length||typeof b.tx[0]!=='string')return b;coinbaseTxids.add(b.tx[0]);return Promise.all(b.tx.map(function(txid,i){return self.getRawTransaction(txid,true).then(function(tx){if(i===0&&tx&&tx.vin&&tx.vin[0]&&!tx.vin[0].coinbase){tx=Object.assign({},tx);tx.vin=[Object.assign({},tx.vin[0],{coinbase:'0000'})];}return tx;}).catch(function(){return{txid:txid};});})).then(function(txs){return Object.assign({},b,{tx:txs});});});};var _rt=C.prototype.getRawTransaction;C.prototype.getRawTransaction=function(txid,verbosity){var flv=(verbosity===0||verbosity===false)?false:true;return _rt.call(this,txid,flv).catch(function(e){var msg=(e&&(e.message||String(e)))||'';if(/no such mempool|transaction not found/i.test(msg)){console.warn('[flowee-shim] getrawtransaction fallback for',txid);var isCb=coinbaseTxids.has(txid);return{txid:txid,hash:txid,version:1,size:0,vsize:0,weight:0,locktime:0,vin:isCb?[{coinbase:'0000',sequence:4294967295}]:[{txid:'0000000000000000000000000000000000000000000000000000000000000000',vout:0,scriptsig:'',scriptsig_asm:'',sequence:4294967295,witness:[]}],vout:[],hex:'',fee:0,status:{confirmed:true,block_height:0,block_hash:''},time:0,blocktime:0};}throw e;});};var _grm=C.prototype.getRawMemPool;C.prototype.getRawMemPool=function(verbose){if(verbose==null)return _grm.call(this);return _grm.call(this,verbose);};console.log('[flowee-shim] Client patched (getBlock+getRawTransaction+getRawMemPool)');}catch(e){console.error('[flowee-shim] error:',e.message);}try{var B=require('/backend/package/api/blocks');var blk=B&&(B.default||B);if(blk&&typeof blk.$getTransactionsExtended==='function'&&!blk.__floweeBlocksPatched){blk.__floweeBlocksPatched=true;var _gte=blk.$getTransactionsExtended.bind(blk);blk.$getTransactionsExtended=async function(){try{return await _gte.apply(blk,arguments);}catch(e2){var em=(e2&&e2.message)||'';if(/Expected first tx.*coinbase|Expected a coinbase tx/i.test(em)){console.warn('[flowee-shim] coinbase check suppressed; using minimal coinbase placeholder');var bt=arguments[2]||0;return[{txid:'0000000000000000000000000000000000000000000000000000000000000000',hash:'0000000000000000000000000000000000000000000000000000000000000000',version:1,size:0,vsize:0,weight:0,locktime:0,vin:[{is_coinbase:true,txid:'',vout:0,prevout:null,scriptsig:'',scriptsig_asm:'',sequence:4294967295,witness:[]}],vout:[],fee:0,status:{confirmed:true,block_height:0,block_hash:''},blockTime:bt}];}throw e2;}};console.log('[flowee-shim] Blocks.$getTransactionsExtended patched');}}catch(eB){console.warn('[flowee-shim] blocks patch:',eB.message);}})();`

/**
 * The 3.12 frontend image ships ~95 pool SVGs under
 * `/resources/mining-pools/`. The old shim proxied that path to
 * bchexplorer.cash, which now returns 403 (browser proof-of-work), so every
 * cube showed a broken "Logo of Unknown mining pool" image. Serve the local
 * files. Only re-add the proxy if a future image has no SVGs.
 */
export const nginxMiningPoolsProxy = [
  `CONF=/etc/nginx/conf.d/nginx-explorer.conf`,
  `POOLS=/var/www/explorer/browser/resources/mining-pools`,
  `MARKER='location /resources/mining-pools/'`,
  `if grep -qF "$MARKER" "$CONF" 2>/dev/null; then`,
  `  awk 'BEGIN{s=0} $0 ~ /location \\/resources\\/mining-pools\\// {s=1; next} s && /}/ {s=0; next} !s {print}' "$CONF" > "$CONF.tmp" && mv "$CONF.tmp" "$CONF"`,
  `  echo "[frontend-shim] mining-pools proxy removed"`,
  `fi`,
  `HAS_LOCAL=$(ls "$POOLS"/*.svg 2>/dev/null | head -1)`,
  `if [ -n "$HAS_LOCAL" ]; then`,
  `  echo "[frontend-shim] serving local mining-pool SVGs"`,
  `else`,
  `  sed -i 's|location /resources {|location /resources/mining-pools/ {\\n\\t\\tproxy_pass https://bchexplorer.cash/resources/mining-pools/;\\n\\t\\tproxy_ssl_server_name on;\\n\\t\\texpires 7d;\\n\\t\\tadd_header Cache-Control "public";\\n\\t}\\n\\tlocation /resources {|' "$CONF"`,
  `  echo "[frontend-shim] mining-pools proxy added (no local SVGs)"`,
  `fi`,
].join('\n')

/**
 * The image's nginx template only routes mainnet `/api/` paths. On any other
 * chain the frontend calls `/<network>/api/...`, which has no proxy and 502s.
 * These blocks strip the network prefix and forward to the same backend — one
 * backend serves one chain, chosen by `EXPLORER_NETWORK`. They reuse the
 * image's own `__…__` placeholders so its entrypoint substitutes the real
 * backend host and port.
 *
 * The alternation must list the network names the *frontend* uses, which are
 * this package's `ExplorerNetwork` values — not the node's own spelling.
 */
export const nginxNetworkRoutes = [
  `CONF=/etc/nginx/conf.d/nginx-explorer.conf`,
  `MARKER='# startos-network-routes'`,
  `if grep -qF "$MARKER" "$CONF" 2>/dev/null; then echo "[frontend-shim] network routes already present"; exit 0; fi`,
  `echo 'location ~ ^/(chipnet|testnet4|scalenet|testnet)/api/v1/ws$ {' >> "$CONF"`,
  `echo '    rewrite ^/[^/]+(/api/v1/ws)$ $1 break;' >> "$CONF"`,
  `echo '    proxy_pass http://__EXPLORER_BACKEND_MAINNET_HTTP_HOST__:__EXPLORER_BACKEND_MAINNET_HTTP_PORT__;' >> "$CONF"`,
  `echo '    proxy_http_version 1.1;' >> "$CONF"`,
  `echo '    proxy_set_header Upgrade $http_upgrade;' >> "$CONF"`,
  `echo '    proxy_set_header Connection "Upgrade";' >> "$CONF"`,
  `echo '}' >> "$CONF"`,
  `echo 'location ~ ^/(chipnet|testnet4|scalenet|testnet)/ws$ {' >> "$CONF"`,
  `echo '    rewrite ^/[^/]+(/ws)$ $1 break;' >> "$CONF"`,
  `echo '    proxy_pass http://__EXPLORER_BACKEND_MAINNET_HTTP_HOST__:__EXPLORER_BACKEND_MAINNET_HTTP_PORT__;' >> "$CONF"`,
  `echo '    proxy_http_version 1.1;' >> "$CONF"`,
  `echo '    proxy_set_header Upgrade $http_upgrade;' >> "$CONF"`,
  `echo '    proxy_set_header Connection "Upgrade";' >> "$CONF"`,
  `echo '}' >> "$CONF"`,
  `echo 'location ~ ^/(chipnet|testnet4|scalenet|testnet)/api/v1/(.*)$ {' >> "$CONF"`,
  `echo '    rewrite ^/[^/]+/api/v1/(.*)$ /api/v1/$1 break;' >> "$CONF"`,
  `echo '    proxy_pass http://__EXPLORER_BACKEND_MAINNET_HTTP_HOST__:__EXPLORER_BACKEND_MAINNET_HTTP_PORT__;' >> "$CONF"`,
  `echo '}' >> "$CONF"`,
  `echo 'location ~ ^/(chipnet|testnet4|scalenet|testnet)/api/(.*)$ {' >> "$CONF"`,
  `echo '    rewrite ^/[^/]+/api/(.*)$ /api/v1/$1 break;' >> "$CONF"`,
  `echo '    proxy_pass http://__EXPLORER_BACKEND_MAINNET_HTTP_HOST__:__EXPLORER_BACKEND_MAINNET_HTTP_PORT__;' >> "$CONF"`,
  `echo '}' >> "$CONF"`,
  `echo "$MARKER" >> "$CONF"`,
  `echo "[frontend-shim] network routes added"`,
].join('\n')

/**
 * The compiled `hex2ascii` pipe strips only U+FFFD and literal `\0`, so raw
 * control bytes in coinbase scriptsig and OP_RETURN payloads render as box
 * glyphs. The repo's own miner-tag parser already strips the same range.
 *
 * The frontend image is Alpine and ships only sh, sed and awk. GNU sed
 * interprets `\x00` in the replacement as a literal NUL byte, so the needle and
 * replacement are passed through the environment to busybox awk, which
 * preserves them byte for byte. Angular emits one chunk per locale, so every
 * chunk carrying the pipe is patched.
 */
export const frontendHex2Ascii = [
  `NEEDLE='.replace(/\\\\0/g,"")'`,
  `REPL='.replace(/\\\\0/g,"").replace(/[\\x00-\\x1F\\x7F-\\x9F]/g,"")'`,
  `MARK='/[\\x00-\\x1F'`,
  `export NEEDLE REPL MARK`,
  `total=0`,
  `for f in $(find /var/www/explorer/browser -name 'chunk-*.js' 2>/dev/null); do ` +
    `grep -F -q "$MARK" "$f" && continue; ` +
    `grep -F -q "$NEEDLE" "$f" || continue; ` +
    `awk 'BEGIN{n=ENVIRON["NEEDLE"];r=ENVIRON["REPL"];nl=length(n);}{line=$0;out="";while((p=index(line,n))>0){out=out substr(line,1,p-1) r;line=substr(line,p+nl);}print out line;}' "$f" > "$f.tmp" 2>/dev/null ` +
    `&& mv "$f.tmp" "$f" ` +
    `&& total=$((total+1)); ` +
    `done`,
  `echo "[frontend-shim] patched $total hex2ascii chunk(s)"`,
].join('; ')
