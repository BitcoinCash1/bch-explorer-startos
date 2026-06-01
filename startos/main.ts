import { FileHelper } from '@start9labs/start-sdk'
import { sdk } from './sdk'
import { webPort, dbPort } from './utils'
import { storeJson } from './file-models/store.json'

export const main = sdk.setupMain(async ({ effects }) => {
  console.log('Starting BCH Explorer!')

  // Read store for DB credentials and selected node package
  const store = await storeJson.read().once()
  const dbPassword = store?.dbPassword ?? 'explorer'
  const nodePackageId = store?.nodePackageId ?? 'bitcoincashd'
  const network = (store?.network ?? 'mainnet') as
    | 'mainnet'
    | 'testnet4'
    | 'chipnet'
    | 'scalenet'
  const nodeHost = `${nodePackageId}.startos`
  // BCHD serves RPC over native TLS; the plaintext stunnel proxy on port 8334
  // forwards to its TLS RPC on 8332 internally. Melroy's backend has no TLS
  // support for CORE_RPC, so we route through the proxy when bchd is selected.
  const nodeRpcPort = nodePackageId === 'bchd' ? '8334' : '8332'

  // Always connect to Fulcrum BCH for Electrum indexing
  const electrumHost = 'fulcrum-bch.startos'

  // Create the API subcontainer first so we can exec into it to read BCHN credentials
  // (the dependency volume is only accessible inside the subcontainer, not in the Node.js process)
  const apiSub = await sdk.SubContainer.of(
    effects,
    { imageId: 'backend' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: '/cache',
        mountpoint: '/backend/cache',
        readonly: false,
      })
      .mountDependency({
        dependencyId: nodePackageId,
        volumeId: 'main',
        subpath: null,
        mountpoint: '/mnt/node',
        readonly: true,
      }),
    'api-sub',
  )

  // Read node RPC credentials from the mounted dependency volume inside the subcontainer
  let nodeUser = nodePackageId
  let nodePass = ''
  try {
    const result = await apiSub.exec(['cat', '/mnt/node/store.json'])
    if (result.exitCode === 0) {
      const nodeStore = JSON.parse(result.stdout.toString()) as {
        rpcUser?: string
        rpcPassword?: string
      }
      nodeUser = nodeStore.rpcUser ?? nodeUser
      nodePass = nodeStore.rpcPassword ?? nodePass
    }
  } catch {
    console.warn('Could not read node store.json — using defaults')
  }

  // Fix cache directory permissions — the volume subpath is created with restrictive
  // ownership by the Start9 runtime; the backend process runs as a non-root user and
  // cannot write './cache/tmp-cache.json' without this chmod.
  await apiSub.exec([
    'sh', '-c',
    'mkdir -p /backend/cache && chmod 777 /backend/cache && echo "[cache-fix] /backend/cache permissions set"',
  ])

  // BCHD compatibility patches:
  // - getblock(verbosity=2) returns `rawtx` not `tx`
  // - getblock does not include `nTx`; derive tx_count from tx/rawtx array length
  // - getblockstats RPC is not implemented (-32601 Method not found); fall back
  //   to the explorer's existing local stats computation (the stale-block path)
  // - getrawtransaction only accepts (txid, verbose), not the 4-param form
  // - getindexinfo is BCHN-only; return {} so the indexer skips BCHN-index tasks
  // - getchaintips is unimplemented on BCHD; return [] so orphan tracking no-ops
  await apiSub.exec([
    'node', '-e',
    `const fs=require('fs');
function p(file,re,s){const c=fs.readFileSync(file,'utf8');const n=c.replace(re,s);if(c!==n){fs.writeFileSync(file,n);console.log('[bchd-shim] patched',file);} else {console.log('[bchd-shim] no-op',file);} }
p('/backend/package/api/blocks.js',
  /const verboseBlock = await bitcoin_client_1\\.default\\.getBlock\\(blockHash, 2\\);/,
  'const verboseBlock = await bitcoin_client_1.default.getBlock(blockHash, 2); verboseBlock.tx = verboseBlock.tx || verboseBlock.rawtx || [];');
p('/backend/package/api/blocks.js',
  /if \\(!block\\.stale\\) \\{\\s*return bitcoin_client_1\\.default\\.getBlockStats\\(block\\.id\\);\\s*\\}/,
  "if (!block.stale) {\\n            try { return await bitcoin_client_1.default.getBlockStats(block.id); }\\n            catch (e) { const m=((e&&e.message)||'')+''; const c=e&&e.code; if (c!==-32601 && !/method not found/i.test(m)) throw e; /* [bchd-shim] getblockstats unsupported; computing locally (silenced to avoid log spam during indexing) */ }\\n        }");
p('/backend/package/api/bitcoin/bitcoin-api.js',
  /\\.getRawTransaction\\(txId, 2, '', true\\)/,
  '.getRawTransaction(txId, true)');
p('/backend/package/api/bitcoin/bitcoin-api.js',
  /tx_count: block\\.nTx,/,
  'tx_count: (block.nTx != null ? block.nTx : ((block.tx && block.tx.length) || (block.rawtx && block.rawtx.length) || 0)),');
p('/backend/package/indexer.js',
  /const indexes = await bitcoin_client_1\\.default\\.getIndexInfo\\(\\);/,
  "let indexes; try { indexes = await bitcoin_client_1.default.getIndexInfo(); } catch (e) { const m=((e&&e.message)||'')+''; const c=e&&e.code; if (c!==-32601 && !/method not found|unimplemented/i.test(m)) throw e; console.warn('[bchd-shim] getindexinfo unsupported; assuming no BCHN indexes'); indexes = {}; }");
p('/backend/package/api/chain-tips.js',
  /this\\.chainTips = await bitcoin_client_1\\.default\\.getChainTips\\(\\);/,
  "try { this.chainTips = await bitcoin_client_1.default.getChainTips(); } catch (e) { const m=((e&&e.message)||'')+''; const c=e&&e.code; if (c!==-32601 && !/method not found|unimplemented/i.test(m)) throw e; if (!global.__bchdShimChainTipsLogged) { console.warn('[bchd-shim] getchaintips unsupported; orphan tracking disabled (logged once)'); global.__bchdShimChainTipsLogged = true; } this.chainTips = []; }");
// [bchd-shim] BCHD validateaddress omits scriptPubKey, which the Electrum scripthash path requires.
// Install a tiny cashaddr->scriptPubKey decoder and wrap validateAddress to enrich the response.
// Also patch getMempoolInfo (BCHD returns only {size,bytes}) and getRawMemPool true verbose entries
// (BCHD returns {size,fee,time,height,depends,...} — translate to Core's {vsize,fees:{base},ancestor*,descendant*,wtxid,spentby}).
const SHIM = "module.exports=function(t){if(t.__cashaddrShim)return;t.__cashaddrShim=true;const o=t.validateAddress.bind(t);const C='qpzry9x8gf2tvdw0s3jn54khce6mua7l';function decCA(a){try{const i=a.indexOf(':');const p=(i>=0?a.slice(i+1):a).toLowerCase();const d=[];for(const c of p){const v=C.indexOf(c);if(v<0)return null;d.push(v);}if(d.length<9)return null;const p5=d.slice(0,d.length-8);let ac=0,b=0;const out=[];for(const v of p5){ac=((ac<<5)|v)&0xffff;b+=5;if(b>=8){b-=8;out.push((ac>>b)&0xff);}}if(!out.length)return null;const ver=out[0],ty=(ver>>3)&0x1f,h=out.slice(1);const hx=h.map(x=>x.toString(16).padStart(2,'0')).join('');if(ty===0&&h.length===20)return '76a914'+hx+'88ac';if(ty===1&&h.length===20)return 'a914'+hx+'87';if(ty===1&&h.length===32)return 'aa20'+hx+'87';return null;}catch(e){return null;}}const B='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';function decLG(a){try{let n=0n;for(const c of a){const v=B.indexOf(c);if(v<0)return null;n=n*58n+BigInt(v);}let hex=n.toString(16);if(hex.length%2)hex='0'+hex;const by=[];for(let i=0;i<hex.length;i+=2)by.push(parseInt(hex.substr(i,2),16));for(const c of a){if(c==='1')by.unshift(0);else break;}if(by.length!==25)return null;const v=by[0],hx=by.slice(1,21).map(x=>x.toString(16).padStart(2,'0')).join('');if(v===0)return '76a914'+hx+'88ac';if(v===5)return 'a914'+hx+'87';return null;}catch(e){return null;}}t.validateAddress=async function(a){const x=await o(a);if(x&&x.isvalid&&!x.scriptPubKey){const s=decCA(x.address||a)||decLG(x.address||a);if(s)x.scriptPubKey=s;}return x;};const omi=t.getMempoolInfo&&t.getMempoolInfo.bind(t);if(omi){t.getMempoolInfo=async function(){const r=await omi();if(!r)return r;const sz=r.size||0,by=r.bytes||0;if(r.usage==null)r.usage=by*3;if(r.maxmempool==null)r.maxmempool=300000000;if(r.mempoolminfee==null)r.mempoolminfee=0.00001;if(r.minrelaytxfee==null)r.minrelaytxfee=0.00001;if(r.total_fee==null)r.total_fee=0;if(r.loaded==null)r.loaded=true;return r;};}const orm=t.getRawMemPool&&t.getRawMemPool.bind(t);if(orm){t.getRawMemPool=async function(verbose){const r=await orm(verbose);if(!verbose||!r||typeof r!=='object'||Array.isArray(r))return r;for(const k in r){const e=r[k];if(!e||typeof e!=='object')continue;const fee=typeof e.fee==='number'?e.fee:0;const sz=e.size||0;if(e.feePerSize==null){e.feePerSize=sz>0?(fee*1e8/sz):0;}if(e.vsize==null)e.vsize=sz;if(!e.fees||typeof e.fees!=='object')e.fees={base:fee,modified:fee,ancestor:fee,descendant:fee};const dep=Array.isArray(e.depends)?e.depends:[];if(e.ancestorcount==null)e.ancestorcount=dep.length+1;if(e.descendantcount==null)e.descendantcount=1;if(e.ancestorsize==null)e.ancestorsize=sz;if(e.descendantsize==null)e.descendantsize=sz;if(e.wtxid==null)e.wtxid=k;if(!Array.isArray(e.spentby))e.spentby=[];}return r;};}const ogme=t.getMempoolEntry&&t.getMempoolEntry.bind(t);let _meCache=null;let _meCacheTime=0;let _meCacheP=null;t.getMempoolEntry=async function(txid){if(ogme){try{return await ogme(txid);}catch(e){}}const now=Date.now();if(!_meCache||now-_meCacheTime>30000){if(!_meCacheP){_meCacheP=t.getRawMemPool(true).then(r=>{_meCache=r;_meCacheTime=Date.now();_meCacheP=null;return r;});}await _meCacheP;}if(_meCache&&_meCache[txid])return _meCache[txid];return{fees:{base:0,modified:0,ancestor:0,descendant:0},size:0,fee:0,vsize:0};};};";
fs.writeFileSync('/backend/package/api/bitcoin/cashaddr-shim.js', SHIM);
{ const f='/backend/package/api/bitcoin/bitcoin-client.js'; const c=fs.readFileSync(f,'utf8'); if(!c.includes('cashaddr-shim')){ fs.writeFileSync(f, c + "\\nrequire('./cashaddr-shim')(exports.default);\\n"); console.log('[bchd-shim] compat-shim installed (cashaddr+mempool)'); } else { console.log('[bchd-shim] compat-shim no-op'); } }
// [bchd-shim] websocket-handler.ts updateSocketDataFields uses truthy check 'if (data[property])'
// which drops bytesPerSecond=0 from the init payload. With BCHD's low-traffic mempool the bps
// value can legitimately be 0 for long periods, leaving the frontend's combineLatest of
// (mempoolInfo$, bytesPerSecond$) never firing — so Minimum fee, Unconfirmed, Memory Usage
// and the Incoming Transactions chart all stay in their "loading" placeholder state. Keep
// nullish-only filtering so legitimate zero values still propagate.
p('/backend/package/api/websocket-handler.js',
  /if \\(data\\[property\\]\\) \\{/,
  'if (data[property] != null) {');
// [bchd-shim] blocks.tx_count column is smallint(5) unsigned (max 65535) but BCH blocks
// can exceed that (e.g. block 840002 has 72,174 txs). The miner indexer hits an
// out-of-range INSERT, retries forever, never indexes anything, and the dashboard
// widgets (Minimum fee, Memory Usage, Unconfirmed, Incoming Transactions chart) stay
// blank because they consume indexed-state data. Two fixes:
//   1. Widen the column for fresh installs (migration text in $createMissingTablesAndIndexes).
//   2. Force an idempotent ALTER at startup for installs that already passed that migration.
p('/backend/package/api/database-migration.js',
  /tx_count\` smallint unsigned/g,
  'tx_count\` int unsigned');
p('/backend/package/api/database-migration.js',
  /async \\$initializeOrMigrateDatabase\\(\\) \\{\\s*logger_1\\.default\\.debug\\('MIGRATIONS: Running migrations'\\);/,
  "async $initializeOrMigrateDatabase() { logger_1.default.debug('MIGRATIONS: Running migrations'); try { await database_1.default.query('ALTER TABLE blocks MODIFY \`tx_count\` int unsigned NOT NULL DEFAULT 0'); } catch (e) { /* table may not exist yet on first run; smallint→int alter is idempotent and harmless to retry */ }");
// [bchd-shim] statistics.js filters memPoolArray by truthy tx.feePerSize, dropping all
// transactions where feePerSize is undefined (BCHD entries don't include this field).
// The getRawMemPool shim above now sets feePerSize=sat/byte so zero-fee txs get feePerSize=0.
// Use fs.writeFileSync via p() — sed -i fails on overlayfs (rename of squashfs-backed
// directory: "Directory not empty") so the sed-based approach silently did nothing.
p('/backend/package/api/statistics/statistics.js',
  /memPoolArray\\.filter\\(\\(tx\\) => tx\\.feePerSize\\)/,
  'memPoolArray.filter((tx) => tx.feePerSize != null)');`,
  ])

  // [flowee-shim] Flowee's getblock/getrawtransaction only accept boolean verbose, not
  // integer verbosity levels (0/1/2) or extra parameters. Monkey-patch Client.prototype
  // at require-hook time so ALL call sites are fixed without touching individual files.
  // For verbosity=2 (full tx data), hydrate each transaction from getRawTransaction.
  if (nodePackageId === 'flowee') {
    const hookSrc = `(function(){var coinbaseTxids=new Set();try{var m=require('/backend/package/rpc-api/index'),C=m.Client;if(C.prototype.__floweePatched)return;C.prototype.__floweePatched=true;var _gb=C.prototype.getBlock;C.prototype.getBlock=function(hash,verbosity,patterns){var flv=(verbosity===0||verbosity===false)?false:true,needHydrate=(verbosity===2),self=this,p=_gb.call(self,hash,flv);if(!needHydrate)return p;return p.then(function(b){if(!b||!Array.isArray(b.tx)||!b.tx.length||typeof b.tx[0]!=='string')return b;coinbaseTxids.add(b.tx[0]);return Promise.all(b.tx.map(function(txid,i){return self.getRawTransaction(txid,true).then(function(tx){if(i===0&&tx&&tx.vin&&tx.vin[0]&&!tx.vin[0].coinbase){tx=Object.assign({},tx);tx.vin=[Object.assign({},tx.vin[0],{coinbase:'0000'})];}return tx;}).catch(function(){return{txid:txid};});})).then(function(txs){return Object.assign({},b,{tx:txs});});});};var _rt=C.prototype.getRawTransaction;C.prototype.getRawTransaction=function(txid,verbosity){var flv=(verbosity===0||verbosity===false)?false:true;return _rt.call(this,txid,flv).catch(function(e){var msg=(e&&(e.message||String(e)))||'';if(/no such mempool|transaction not found/i.test(msg)){console.warn('[flowee-shim] getrawtransaction fallback for',txid);return{txid:txid,hash:txid,version:1,size:0,vsize:0,weight:0,locktime:0,vin:[{coinbase:'0000',sequence:4294967295}],vout:[],hex:'',fee:0,status:{confirmed:true,block_height:0,block_hash:''},time:0,blocktime:0};}throw e;});};var _grm=C.prototype.getRawMemPool;C.prototype.getRawMemPool=function(verbose){if(verbose==null)return _grm.call(this);return _grm.call(this,verbose);};console.log('[flowee-shim] Client patched (getBlock+getRawTransaction+getRawMemPool)');}catch(e){console.error('[flowee-shim] error:',e.message);}try{var B=require('/backend/package/api/blocks');var blk=B&&(B.default||B);if(blk&&typeof blk.$getTransactionsExtended==='function'&&!blk.__floweeBlocksPatched){blk.__floweeBlocksPatched=true;var _gte=blk.$getTransactionsExtended.bind(blk);blk.$getTransactionsExtended=async function(){try{return await _gte.apply(blk,arguments);}catch(e2){var em=(e2&&e2.message)||'';if(/Expected first tx.*coinbase/i.test(em)){console.warn('[flowee-shim] coinbase check suppressed; using minimal coinbase placeholder');var bt=arguments[2]||0;return[{txid:'0000000000000000000000000000000000000000000000000000000000000000',hash:'0000000000000000000000000000000000000000000000000000000000000000',version:1,size:0,vsize:0,weight:0,locktime:0,vin:[{is_coinbase:true,txid:'',vout:0,prevout:null,scriptsig:'',scriptsig_asm:'',sequence:4294967295,witness:[]}],vout:[],fee:0,status:{confirmed:true,block_height:0,block_hash:''},blockTime:bt}];}throw e2;}};console.log('[flowee-shim] Blocks.$getTransactionsExtended patched');}}catch(eB){console.warn('[flowee-shim] blocks patch:',eB.message);}})();`
    await FileHelper.string({
      base: sdk.volumes.main,
      subpath: '/cache/flowee-require-hook.js',
    }).write(effects, hookSrc)
  }

  return sdk.Daemons.of(effects)
    .addDaemon('db', {
      subcontainer: await sdk.SubContainer.of(
        effects,
        { imageId: 'db' },
        sdk.Mounts.of().mountVolume({
          volumeId: 'db',
          subpath: null,
          mountpoint: '/var/lib/mysql',
          readonly: false,
        }),
        'db-sub',
      ),
      exec: {
        command: sdk.useEntrypoint(['--bind-address=127.0.0.1']),
        env: {
          MYSQL_DATABASE: 'explorer',
          MYSQL_USER: 'explorer',
          MYSQL_PASSWORD: dbPassword,
          MARIADB_AUTO_UPGRADE: '1',
          MARIADB_RANDOM_ROOT_PASSWORD: '1',
        },
      },
      ready: {
        display: 'Database',
        fn: async () =>
          sdk.healthCheck.checkPortListening(effects, dbPort, {
            successMessage: 'Database is ready',
            errorMessage: 'Database is starting...',
          }),
      },
      requires: [],
    })
    .addDaemon('api', {
      subcontainer: apiSub,
      exec: {
        command: ['./start.sh'],
        env: {
          EXPLORER_BACKEND: 'electrum',
          EXPLORER_NETWORK: network,
          EXPLORER_INDEXING_BLOCKS_AMOUNT: '-1',
          CORE_RPC_HOST: nodeHost,
          CORE_RPC_PORT: nodeRpcPort,
          CORE_RPC_USERNAME: nodeUser,
          CORE_RPC_PASSWORD: nodePass,
          ELECTRUM_HOST: electrumHost,
          ELECTRUM_PORT: '50001',
          DATABASE_ENABLED: 'true',
          DATABASE_HOST: '127.0.0.1',
          DATABASE_PORT: String(dbPort),
          DATABASE_DATABASE: 'explorer',
          DATABASE_USERNAME: 'explorer',
          DATABASE_PASSWORD: dbPassword,
          STATISTICS_ENABLED: 'true',
          EXPLORER_AUDIT: 'true',
          EXPLORER_GOGGLES_INDEXING: 'true',
          ...(nodePackageId === 'flowee'
            ? { NODE_OPTIONS: '--require /backend/cache/flowee-require-hook.js' }
            : {}),
        },
      },
      ready: {
        display: 'API',
        fn: async () =>
          sdk.healthCheck.checkPortListening(effects, 8999, {
            successMessage: 'BCH Explorer API is ready',
            errorMessage: 'BCH Explorer API is starting...',
          }),
      },
      requires: ['db'],
    })
    .addDaemon('web', {
      subcontainer: await (async () => {
        const webSub = await sdk.SubContainer.of(
          effects,
          { imageId: 'frontend' },
          sdk.Mounts.of(),
          'web-sub',
        )
        // [frontend-shim] The hex2ascii pipe in the compiled Angular bundle only strips
        // U+FFFD and literal "\0" sequences; raw control bytes (0x01-0x1F, 0x7F-0x9F) in
        // coinbase scriptsig and OP_RETURN payloads still render as box/gibberish glyphs
        // ("f~j] +j{ ckpool/..."). The repo's own miner-tag parser already strips
        // /[\x00-\x1F\x7F-\x9F]/ for the same reason; mirror that here so coinbase tooltips
        // and tx scriptsig hovers show clean ASCII like "/ckpool/mined by ... on 5tratumOS/".
        // Per-locale chunks are emitted by Angular i18n; patch every chunk that contains the
        // pipe's TextDecoder() chain so all language bundles are covered.
        // The frontend image is Alpine-based and ships only sh, sed, awk
        // (no node, no perl, no python). GNU sed mangles `\x00` notation in
        // the replacement (interprets it as a literal NUL byte), so use
        // busybox awk reading the needle/replacement from environment vars
        // (which preserves bytes verbatim — no escape interpretation).
        // [frontend-shim] The Melroy frontend image has no mining-pools SVG assets.
        // Inject a nginx location block that proxies /resources/mining-pools/ to
        // the upstream bchexplorer.cash so pool logos render in the dashboard.
        await webSub.exec([
          'sh', '-c',
          `CONF=/etc/nginx/conf.d/nginx-explorer.conf; ` +
          `MARKER='location /resources/mining-pools/'; ` +
          `if ! grep -qF "$MARKER" "$CONF" 2>/dev/null; then ` +
            `sed -i 's|location /resources {|location /resources/mining-pools/ {\\n\\t\\tproxy_pass https://bchexplorer.cash/resources/mining-pools/;\\n\\t\\tproxy_ssl_server_name on;\\n\\t\\texpires 7d;\\n\\t\\tadd_header Cache-Control "public";\\n\\t}\\n\\tlocation /resources {|' "$CONF" ` +
            `&& echo "[frontend-shim] mining-pools proxy added" ` +
            `|| echo "[frontend-shim] mining-pools proxy sed failed"; ` +
          `else echo "[frontend-shim] mining-pools proxy already present"; fi`,
        ])
        await webSub.exec([
          'sh', '-c',
          [
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
          ].join('; '),
        ])
        return webSub
      })(),
      exec: {
          // upstream images from ghcr.io/bitcoincash1/
        command: sdk.useEntrypoint(),
        env: {
          // Entrypoint maps these to nginx config sed replacements
          BACKEND_MAINNET_HTTP_HOST: '127.0.0.1',
          BACKEND_MAINNET_HTTP_PORT: '8999',
          FRONTEND_HTTP_PORT: String(webPort),
          // Entrypoint maps these to __VAR__ exports for envsubst on config.js
          // Only the selected network is enabled; ROOT_NETWORK pins the UI
          // to that network. Mainnet keeps ROOT_NETWORK empty for default routing.
          MAINNET_ENABLED: network === 'mainnet' ? 'true' : 'false',
          TESTNET_ENABLED: 'false',
          TESTNET4_ENABLED: network === 'testnet4' ? 'true' : 'false',
          SIGNET_ENABLED: 'false',
          ITEMS_PER_PAGE: '10',
          KEEP_BLOCKS_AMOUNT: '8',
          NGINX_PROTOCOL: 'http',
          NGINX_HOSTNAME: 'localhost',
          NGINX_PORT: '8999',
          MIN_BLOCK_SIZE_UNITS: '32000000',
          MEMPOOL_BLOCKS_AMOUNT: '1',
          BASE_MODULE: 'explorer',
          ROOT_NETWORK: network === 'mainnet' ? '' : network,
          WEBSITE_URL: 'https://bchexplorer.cash',
          MINING_DASHBOARD: 'true',
          AUDIT: 'true',
          MAINNET_BLOCK_AUDIT_START_HEIGHT: '951500',
          TESTNET_BLOCK_AUDIT_START_HEIGHT: '0',
          SIGNET_BLOCK_AUDIT_START_HEIGHT: '0',
          TESTNET4_BLOCK_AUDIT_START_HEIGHT: '0',
          MAINNET_TX_FIRST_SEEN_START_HEIGHT: '951500',
          TESTNET_TX_FIRST_SEEN_START_HEIGHT: '0',
          TESTNET4_TX_FIRST_SEEN_START_HEIGHT: '0',
          SIGNET_TX_FIRST_SEEN_START_HEIGHT: '0',
          REGTEST_TX_FIRST_SEEN_START_HEIGHT: '0',
          SERVICES_API: 'https://bchexplorer.cash/api/v1/services',
          HISTORICAL_PRICE: 'true',
          ADDITIONAL_CURRENCIES: 'false',
          STRATUM_ENABLED: 'false',
        },
      },
      ready: {
        display: 'Web UI',
        fn: async () =>
          sdk.healthCheck.checkPortListening(effects, webPort, {
            successMessage: 'BCH Explorer is ready',
            errorMessage: 'BCH Explorer web UI is starting...',
          }),
      },
      requires: ['api'],
    })
})
// rotated 2026-05-10T19:09:29Z
