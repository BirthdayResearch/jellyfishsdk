import { WhaleRpcClient } from '@defichain/whale-api-client'
import { AddressParser } from '../src/saga/AddressParser'
import { DfTxAddressParser } from '../src/saga/AddressParser/dftx/_abstract'
import { UtxoAddressParser } from '../src/saga/AddressParser/UtxoAddressParser'
import { StubbedUtxoAddressParser } from './StubbedUtxoAddressParser'

export function AddressParserTest (
  apiClient: WhaleRpcClient,
  dfTxAddressParsers: Array<DfTxAddressParser<any>> = [],
  utxoAddressParser: UtxoAddressParser = new StubbedUtxoAddressParser(apiClient)
): AddressParser {
  return new AddressParser(apiClient, 'regtest', dfTxAddressParsers, utxoAddressParser)
}
