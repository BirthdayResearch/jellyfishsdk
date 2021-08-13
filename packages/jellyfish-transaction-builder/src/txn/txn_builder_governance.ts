import {
  OP_CODES, Script, TransactionSegWit,
  CreateProposal
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'
import BigNumber from 'bignumber.js'

export class TxnBuilderGovernance extends P2WPKHTxnBuilder {
  /**
   * Creates a Community fund proposal.
   *
   * @param {CreateProposal} createCfp txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async createCfp (createCfp: CreateProposal, changeScript: Script): Promise<TransactionSegWit> {
    if (createCfp.type !== 0x01) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_CFP_TYPE,
        'CreateCfp type should equal 0x01'
      )
    }
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_CFP(createCfp),
      changeScript,
      new BigNumber('1') // For creation fee (regtest - 1, other than regtest - 10)
    )
  }

  /**
   * Creates a vote of confidence.
   *
   * @param {CreateProposal} createVoc txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async createVoc (createVoc: CreateProposal, changeScript: Script): Promise<TransactionSegWit> {
    if (createVoc.type !== 0x03) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_VOC_TYPE,
        'CreateVoc type should be 0x03'
      )
    }
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
    if (createVoc.cycles !== 2) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_VOC_CYCLES,
        'CreateVoc cycles should be 2'
      )
    }
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_VOC(createVoc),
      changeScript,
      new BigNumber('5') // For creation fee (regtest - 5, other than regtest - 50)
    )
  }
}
