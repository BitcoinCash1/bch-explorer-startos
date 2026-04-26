// BCHD API compatibility patches — run once at container startup (idempotent)
// 1. blocks.js: BCHD verbosity=2 getblock returns `rawtx` not `tx`
// 2. bitcoin-api.js: BCHD getrawtransaction only accepts (txid, verbose), not 4 params
const fs = require('fs')

function patch(file, re, replacement) {
  const before = fs.readFileSync(file, 'utf8')
  const after = before.replace(re, replacement)
  if (before !== after) {
    fs.writeFileSync(file, after)
    console.log('patched:', file)
  }
}

patch(
  '/backend/package/api/blocks.js',
  /const verboseBlock = await bitcoin_client_1\.default\.getBlock\(blockHash, 2\);/,
  'const verboseBlock = await bitcoin_client_1.default.getBlock(blockHash, 2); verboseBlock.tx = verboseBlock.tx || verboseBlock.rawtx || [];',
)

patch(
  '/backend/package/api/bitcoin/bitcoin-api.js',
  /\.getRawTransaction\(txId, 2, '', true\)/,
  '.getRawTransaction(txId, 2)',
)
