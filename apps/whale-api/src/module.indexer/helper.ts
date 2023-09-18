import { blockchain } from '@defichain/jellyfish-api-core'

function checkIfEvmTx (txn: blockchain.Transaction): boolean {
  return txn.vin.length === 2 && txn.vin.every(vin => vin.txid === '0000000000000000000000000000000000000000000000000000000000000000')
}

export {
  checkIfEvmTx
}
