import { ApiClient, blockchain as defid } from '@defichain/jellyfish-api-core'
import { ActiveAddress } from './ActiveAddress'

export class UtxoAddressParser {
  constructor (protected readonly apiClient: ApiClient) {}

  async extractFromVout (vout: defid.Vout): Promise<ActiveAddress[]> {
    return vout.scriptPubKey.addresses.map(a => ({
      tokenId: -1, // TBD: use zero to combine utxo and DFI token rich list as one
      address: a
    }))
  }

  /**
   * @WARNING only use this for utxo type prevout (casting result to defid.Vout)
   */
  async extractFromVin (vin: defid.Vin): Promise<ActiveAddress[]> {
    const prevout = await this._findPrevout(vin.txid, vin.vout)
    return await this.extractFromVout(prevout)
  }

  private async _findPrevout (txid: string, n: number): Promise<defid.Vout> {
    const raw = await this.apiClient.rawtx.getRawTransaction(txid, true)
    return raw.vout.find(vo => vo.n === n) as defid.Vout
  }
}
