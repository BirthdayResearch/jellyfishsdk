import { CreateCfp, CreateVoc, OP_CODES, Script, TransactionSegWit, Vote, SetGovernance, SetGovernanceHeight } from '@defichain/jellyfish-transaction'
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
  async createCfp (createCfp: CreateCfp, changeScript: Script): Promise<TransactionSegWit> {
    if (createCfp.nCycles > 100) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_CFP_CYCLE,
        'CreateCfp cycles should be between 0 and 100'
      )
    }
    const creationFee = BigNumber.maximum(10, createCfp.nAmount.multipliedBy(0.01))
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
  async createVoc (createVoc: CreateVoc, changeScript: Script): Promise<TransactionSegWit> {
    if (!createVoc.nAmount.isEqualTo(new BigNumber(0))) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_VOC_AMOUNT,
        'CreateVoc amount should be 0'
      )
    }
    if (createVoc.address.stack.length !== 0) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_VOC_ADDRESS,
        'CreateVoc address stack should be empty'
      )
    }
    let creationFee = new BigNumber('5')
    if (this.network.name === 'mainnet') {
      if (createVoc.options === 1) {
        creationFee = new BigNumber('5000')
      } else {
        creationFee = new BigNumber('50')
      }
    } else if (this.network.name === 'testnet') {
      if (createVoc.options === 1) {
        creationFee = new BigNumber('50')
      } else {
        creationFee = new BigNumber('50')
      }
    } else if (createVoc.options === 1) {
      creationFee = new BigNumber('10000')
    }
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_VOC(createVoc),
      changeScript,
      creationFee
    )
  }

  /**
   * Vote on a community proposal.
   *
   * @param {Vote} vote txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async vote (vote: Vote, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_VOTE(vote),
      changeScript
    )
  }

  /**
   * Set governance variable.
   *
   * @param {SetGovernance} setGov txn to create
   * @param {Script} changeScript to send unspent to after deducting the fee
   * @returns {Promise<TransactionSegWit>}
   */
  async setGoverance (setGov: SetGovernance, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_SET_GOVERNANCE(setGov),
      changeScript
    )
  }

  /**
   * Set governance variable with activation height.
   *
   * @param {SetGovernanceHeight} setGovHeight txn to create
   * @param {Script} changeScript to send unspent to after deducting the fee
   * @returns {Promise<TransactionSegWit>}
   */
  async setGoveranceHeight (setGovHeight: SetGovernanceHeight, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_SET_GOVERNANCE_HEIGHT(setGovHeight),
      changeScript
    )
  }
}
