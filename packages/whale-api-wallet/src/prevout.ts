import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { PrevoutProvider, Prevout } from '@defichain/jellyfish-transaction-builder'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { WhaleWalletAccount } from './wallet'

export class WhalePrevoutProvider implements PrevoutProvider {
  /**
   * @param {WhaleWalletAccount} account to read prevout from
   * @param {number} size max size of prevout to read from all, prevout availability is limited by this
   */
  constructor (
    protected readonly account: WhaleWalletAccount,
    protected readonly size: number
  ) {
  }

  async all (): Promise<Prevout[]> {
    const address = await this.account.getAddress()
    const unspent = await this.account.client.address.listTransactionUnspent(address, this.size)
    return unspent.map((item): Prevout => {
      return {
        txid: item.vout.txid,
        vout: item.vout.n,
        value: new BigNumber(item.vout.value),
        script: {
          // TODO(fuxingloh): needs to refactor once jellyfish refactor this.
          stack: toOPCodes(SmartBuffer.fromBuffer(Buffer.from(item.script.hex, 'hex')))
        },
        tokenId: item.vout.tokenId ?? 0x00
      }
    })
  }

  async collect (minBalance: BigNumber): Promise<Prevout[]> {
    // TODO(fuxingloh): min balance filtering
    return await this.all()
  }
}
