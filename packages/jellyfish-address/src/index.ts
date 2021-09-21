import { getNetwork, NetworkName } from '@defichain/jellyfish-network'
import { Address, AddressType, UnknownTypeAddress } from './address'
import { Base58Address } from './base58_address'
import { Bech32Address } from './bech32_address'
import { P2PKH } from './p2pkh'
import { P2SH } from './p2sh'
import { P2WSH } from './p2wsh'
import { P2WPKH } from './p2wpkh'

export * from './address'
export * from './base58_address'
export * from './bech32_address'
export * from './p2pkh'
export * from './p2sh'
export * from './p2wpkh'
export * from './p2wsh'

/**
 * When insist to use the "network" decoded from raw address, instead of passing one based on running application environment
 * @param address raw human readable address (utf-8)
 * @returns DefiAddress or a child class
 */
function guess (address: string): Address {
  const networks: NetworkName[] = ['mainnet', 'testnet', 'regtest']
  const defaultOne = new UnknownTypeAddress(getNetwork('mainnet'), address)
  for (let i = 0; i < networks.length; i += 1) {
    const guessed = from(networks[i], address)
    if (guessed.valid) {
      return guessed
    }
  }
  return defaultOne
}

/**
 * @param net to be validated against the decoded one from the raw address
 * @param address raw human readable address (utf-8)
 * @returns DefiAddress or a child class
 */
function from<T extends Address> (net: NetworkName, address: string): T {
  const network = getNetwork(net)
  const possible: Map<AddressType, Address> = new Map()
  possible.set('Unknown', new UnknownTypeAddress(network, address))
  possible.set('P2PKH', Base58Address.fromAddress<P2PKH>(network, address, P2PKH))
  possible.set('P2SH', Base58Address.fromAddress<P2SH>(network, address, P2SH))
  possible.set('P2WPKH', Bech32Address.fromAddress<P2WPKH>(network, address, P2WPKH))
  possible.set('P2WSH', Bech32Address.fromAddress<P2WSH>(network, address, P2WSH))

  possible.forEach(each => each.validate())

  let valid
  possible.forEach(each => {
    if (each.valid) {
      valid = each
    }
  })

  /* eslint-disable @typescript-eslint/strict-boolean-expressions */
  if (valid) {
    // find if any has all validator passed
    return valid
  }

  // else select the closest guess (most validator passed)
  // default, when non have validator passed
  let highestKey: AddressType = 'Unknown'
  let highestCount = 0

  possible.forEach((val, key) => {
    if (val.validatorPassed > highestCount) {
      highestKey = key
      highestCount = val.validatorPassed
    }
  })
  return (possible.get(highestKey) as T)
}

export const DeFiAddress = {
  guess,
  from
}

export * from './script/script'
