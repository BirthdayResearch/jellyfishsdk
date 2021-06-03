import {
  OP_CODES, Script, TransactionSegWit,
  AppointOracle, RemoveOracle, SetOracleData, UpdateOracle
} from '@defichain/jellyfish-transaction'
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

  /**
   * Removes an oracle. Currently requires Foundation Authorization.
   *
   * @param {RemoveOracle} removeOracle txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async removeOracle (removeOracle: RemoveOracle, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_REMOVE_ORACLE(removeOracle),
      changeScript
    )
  }

  /**
   * Updates an oracle. Currently requires Foundation Authorization.
   *
   * @param {UpdateOracle} updateOracle txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @throws {TxnBuilderError} if 'updateOracle.weightage' is below `1` or over `100`
   * @returns {Promise<TransactionSegWit>}
   */
  async updateOracle (updateOracle: UpdateOracle, changeScript: Script): Promise<TransactionSegWit> {
    if (updateOracle.weightage < 1 || updateOracle.weightage > 100) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_UPDATE_ORACLE_INPUT,
        'Conversion input `updateOracle.weightage` must be above `0` and below `101`'
      )
    }

    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_UPDATE_ORACLE(updateOracle),
      changeScript
    )
  }

  /**
   * Sets data on an oracle. Currently requires Foundation Authorization.
   *
   * @param {SetOracleData} setOracleData txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async setOracleData (setOracleData: SetOracleData, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_SET_ORACLE_DATA(setOracleData),
      changeScript
    )
  }
}
