import { CreateGovCfp, CreateGovVoc, OP_CODES, Script, TransactionSegWit, VoteGov, SetGovernance, SetGovernanceHeight } from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'
import BigNumber from 'bignumber.js'

export class TxnBuilderGovernance extends P2WPKHTxnBuilder {
  /**
   * Creates a Community fund proposal.
   *
   * @param {CreateGovCfp} createGovCfp txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async createGovCfp (createGovCfp: CreateGovCfp, changeScript: Script): Promise<TransactionSegWit> {
    const creationFee = this.network.name === 'regtest' ? new BigNumber('1') : new BigNumber('10')
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_CFP(createGovCfp),
      changeScript,
      creationFee
    )
  }

  /**
   * Creates a vote of confidence.
   *
   * @param {CreateGovVoc} createGovVoc txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async createGovVoc (createGovVoc: CreateGovVoc, changeScript: Script): Promise<TransactionSegWit> {
    if (!createGovVoc.amount.isEqualTo(new BigNumber(0))) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_VOC_AMOUNT,
        'CreateGovVoc amount should be 0'
      )
    }
    if (createGovVoc.address.stack.length !== 0) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_VOC_ADDRESS,
        'CreateGovVoc address stack should be empty'
      )
    }
    const creationFee = this.network.name === 'regtest' ? new BigNumber('5') : new BigNumber('50')
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_VOC(createGovVoc),
      changeScript,
      creationFee
    )
  }

  /**
   * Vote on a community proposal.
   *
   * @param {VoteGov} voteGov txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async voteGov (voteGov: VoteGov, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_VOTE(voteGov),
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
