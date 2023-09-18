import { blockchain } from '@defichain/jellyfish-api-core'
import { NULL_TX_ID } from './constants'

function checkIfEvmTx (txn: blockchain.Transaction): boolean {
  return txn.vin.length === 2 && txn.vin.every(vin => vin.txid === NULL_TX_ID)
}

export {
  checkIfEvmTx
}
