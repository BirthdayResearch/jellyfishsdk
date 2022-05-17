import {
  OP_CODES, Script, TransactionSegWit,
  CreateVault,
  UpdateVault,
  DepositToVault,
  WithdrawFromVault,
  CloseVault,
  PlaceAuctionBid
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { BigNumber } from '@defichain/jellyfish-json'

export class TxnBuilderVault extends P2WPKHTxnBuilder {
  /**
   * Creates vault transaction.
   *
   * @param {CreateVault} createVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async createVault (createVault: CreateVault, changeScript: Script): Promise<TransactionSegWit> {
    const creationFee = this.network.name === 'mainnet' ? new BigNumber('2') : new BigNumber('1')

    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_VAULT(createVault),
      changeScript,
      creationFee
    )
  }

  /**
   * Create update vault transaction.
   *
   * @param {UpdateVault} updateVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async updateVault (updateVault: UpdateVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_UPDATE_VAULT(updateVault),
      changeScript
    )
  }

  /**
   * Deposit to vault transaction.
   *
   * @param {DepositToVault} depositToVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async depositToVault (depositToVault: DepositToVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_DEPOSIT_TO_VAULT(depositToVault),
      changeScript
    )
  }

  /**
   * Withdraw from vault transaction.
   *
   * @param {withdrawFromVault} withdrawFromVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async withdrawFromVault (withdrawFromVault: WithdrawFromVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_WITHDRAW_FROM_VAULT(withdrawFromVault),
      changeScript
    )
  }

  /**
   * Close a vault.
   *
   * @param {CloseVault} closeVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async closeVault (closeVault: CloseVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CLOSE_VAULT(closeVault),
      changeScript
    )
  }

  /**
   * placeAuctionBid transaction.
   *
   * @param {PlaceAuctionBid} placeAuctionBid txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async placeAuctionBid (placeAuctionBid: PlaceAuctionBid, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_AUCTION_BID(placeAuctionBid),
      changeScript
    )
  }
}
