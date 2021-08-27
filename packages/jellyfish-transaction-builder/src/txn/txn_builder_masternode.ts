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
  async create (createMasternode: CreateMasternode, changeScript: Script, network = 'mainnet'): Promise<TransactionSegWit> {
    const creationFee = network === 'regtest' ? new BigNumber('1') : new BigNumber('10')
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
}
