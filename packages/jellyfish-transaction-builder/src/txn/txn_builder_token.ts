import { OP_CODES, Script, TransactionSegWit, TokenCreate } from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import BigNumber from 'bignumber.js'

export class TxnBuilderToken extends P2WPKHTxnBuilder {
  /**
   * Requires at least 0.01 DFI to create transaction, actual fees are much lower.
   *
   * @param {TokenCreate} token txn to create
   * @param {Script} changeScript to send unspent to after deducting the fees
   */
  async createToken (token: TokenCreate, changeScript: Script): Promise<TransactionSegWit> {
    const creationFee = this.network.name === 'regtest' ? new BigNumber('1') : new BigNumber('100')
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_TOKEN_CREATE(token),
      changeScript,
      creationFee
    )
  }
}
