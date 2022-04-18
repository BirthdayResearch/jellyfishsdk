import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { UtxoAddressParser } from '../src/saga/AddressParser/UtxoAddressParser'

export class StubbedUtxoAddressParser extends UtxoAddressParser {
  async extractFromVout (vout: defid.Vout): Promise<string[]> {
    return []
  }

  async extractFromVin (vin: defid.Vin): Promise<string[]> {
    return []
  }
}
