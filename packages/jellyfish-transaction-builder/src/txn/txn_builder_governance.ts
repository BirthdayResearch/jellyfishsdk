import {
  OP_CODES,
  Script,
  TransactionSegWit,
  CreateVoc,
  CreateCfp
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'
import BigNumber from 'bignumber.js'

export class TxnBuilderGovernance extends P2WPKHTxnBuilder {
  /**
   * Creates a Community fund proposal.
   *
   * @param {CreateCfp} createCfp txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async createCfp (createCfp: CreateCfp, changeScript: Script, network = 'mainnet'): Promise<TransactionSegWit> {
    const creationFee = network === 'regtest' ? new BigNumber('1') : new BigNumber('10')
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_CFP(createCfp),
      changeScript,
      creationFee
    )
  }

  /**
   * Creates a vote of confidence.
   *
   * @param {CreateVoc} createVoc txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async createVoc (createVoc: CreateVoc, changeScript: Script, network = 'mainnet'): Promise<TransactionSegWit> {
    if (!createVoc.amount.isEqualTo(new BigNumber(0))) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_VOC_AMOUNT,
        'CreateVoc amount should be 0'
      )
    }
    if (createVoc.address.stack.length !== 0) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_VOC_ADDRESS,
        'CreateVoc address stack should be empty'
      )
    }
    const creationFee = network === 'regtest' ? new BigNumber('5') : new BigNumber('50')
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_VOC(createVoc),
      changeScript,
      creationFee
    )
  }
}
