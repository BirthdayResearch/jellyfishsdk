import { ApiClient, blockchain as defid } from '@defichain/jellyfish-api-core'

export class UtxoAddressParser {
  constructor (protected readonly apiClient: ApiClient) {}

  /**
   * @WARNING return empty for any `nulldata` typed scriptPubKey
   */
  async extractFromVout (vout: defid.Vout): Promise<string[]> {
    return vout.scriptPubKey.addresses ?? []
  }

  /**
   * @WARNING only use this for utxo type prevout (casting result to defid.Vout)
   */
  async extractFromVin (vin: defid.Vin): Promise<string[]> {
    if (vin.txid === undefined) {
      // masternode rewards
      return []
    }

    const prevout = await this._findPrevout(vin.txid, vin.vout)
    return await this.extractFromVout(prevout)
  }

  private async _findPrevout (txid: string, n: number): Promise<defid.Vout> {
    const raw = await this.apiClient.rawtx.getRawTransaction(txid, true)
    return raw.vout.find(vo => vo.n === n) as defid.Vout
  }
}
