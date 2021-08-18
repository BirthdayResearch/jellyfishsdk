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
  async create (createMasternode: CreateMasternode, changeScript: Script, network = 'regtest'): Promise<TransactionSegWit> {
    const creationFee = network === 'regtest' ? new BigNumber('1') : new BigNumber('10')
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
}
