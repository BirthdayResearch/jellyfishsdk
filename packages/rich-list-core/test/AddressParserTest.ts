import { ApiClient } from '@defichain/jellyfish-api-core'
import { AddressParser } from '../src/controller/AddressParser'
import { DfTxAddressParser } from '../src/controller/AddressParser/dftx/_abstract'
import { UtxoAddressParser } from '../src/controller/AddressParser/utxo'
import { StubbedUtxoAddressParser } from './StubbedUtxoAddressParser'

export function AddressParserTest (
  apiClient: ApiClient,
  dfTxAddressParsers: Array<DfTxAddressParser<any>> = [],
  utxoAddressParser: UtxoAddressParser = new StubbedUtxoAddressParser(apiClient)
): AddressParser {
  return new AddressParser(apiClient, 'regtest', dfTxAddressParsers, utxoAddressParser)
}
