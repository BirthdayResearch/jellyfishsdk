import { BigNumber } from '@defichain/jellyfish-json'
import { OP_CODES, Script, TransactionSegWit, CreateMasternode, ResignMasternode } from '@defichain/jellyfish-transaction'
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
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE(createMasternode),
      changeScript,
      new BigNumber('1') // for creation fee (regtest - 1, other than regtest - 10)
    )
  }

  /**
   * Build resign masternode transaction
   *
   * @param {ResignMasternode} resignMasterNode transaction to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @return {Promise<TransactionSegWit>}
   */
  async resign (resignMasterNode: ResignMasternode, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_RESIGN_MASTER_NODE(resignMasterNode),
      changeScript
    )
  }
}
