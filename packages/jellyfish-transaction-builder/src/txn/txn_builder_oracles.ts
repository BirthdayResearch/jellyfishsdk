import { AppointOracle } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_oracles'
import { OP_CODES, Script, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'

export class TxnBuilderOracles extends P2WPKHTxnBuilder {
  /**
   * Appoints an oracle. Currently requires Foundation Authorization.
   *
   * @param {AppointOracle} appointOracle txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @throws {TxnBuilderError} if 'appointOracle.weightage' is below `1` or over `100`
   * @returns {Promise<TransactionSegWit>}
   */
  async appointOracle (appointOracle: AppointOracle, changeScript: Script): Promise<TransactionSegWit> {
    if (appointOracle.weightage < 1 || appointOracle.weightage > 100) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_APPOINT_ORACLE_INPUT,
        'Conversion input `appointOracle.weightage` must be above `0` and below `101`'
      )
    }

    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_APPOINT_ORACLE(appointOracle),
      changeScript
    )
  }
}
