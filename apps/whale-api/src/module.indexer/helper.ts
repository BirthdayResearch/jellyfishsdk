import { blockchain } from '@defichain/jellyfish-api-core'

function checkIfEvmTx (txn: blockchain.Transaction): boolean {
  // To identify that the transaction is evmtx, it has to have exactly 2 null transaction ids
  return txn.vin.length === 2 &&
    txn.vin.every(vin => vin.txid === '0000000000000000000000000000000000000000000000000000000000000000') &&
    txn.vout.length === 1 &&
    txn.vout[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547839') &&
    txn.vout[0].value.isEqualTo(0)
}

export {
  checkIfEvmTx
}
