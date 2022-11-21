import { BigNumber } from '@defichain/jellyfish-json'
import {
  CreateMasternode,
  OP_CODES,
  ResignMasternode,
  Script,
  TransactionSegWit,
  UpdateMasternode
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderMasternode extends P2WPKHTxnBuilder {
  /**
   * Build create masternode transaction
   *
   * @param {CreateMasternode} createMasternode transaction to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @return {Promise<TransactionSegWit>}
   */
  async create (createMasternode: CreateMasternode, changeScript: Script): Promise<TransactionSegWit> {
    const creationFee = this.network.name === 'regtest' ? new BigNumber('1') : new BigNumber('10')
    // NOTE(canonbrother): adding a force default timelock handling here for better ux as from now on, timelock is mandatory
    // https://github.com/DeFiCh/ain/blob/ff53dcee23db2ffe0da9b147a0a53956f4e7ee31/src/masternodes/mn_checks.h#L159
    createMasternode.timelock = createMasternode.timelock ?? 0x0000
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE(createMasternode),
      changeScript,
      creationFee
    )
  }

  /**
   * Build resign masternode transaction
   *
   * @param {ResignMasternode} resignMasternode transaction to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @return {Promise<TransactionSegWit>}
   */
  async resign (resignMasternode: ResignMasternode, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_RESIGN_MASTER_NODE(resignMasternode),
      changeScript
    )
  }

  /**
   * Build update masternode transaction
   *
   * @param {UpdateMasternode} updateMasternode transaction to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @return {Promise<TransactionSegWit>}
   */
  async update (updateMasternode: UpdateMasternode, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode),
      changeScript
    )
  }
}
