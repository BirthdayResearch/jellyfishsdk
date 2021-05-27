import { Address } from './address'
import { P2PKH } from './p2pkh'
import { P2SH } from './p2sh'
import { P2WSH } from './p2wsh'
import { P2WPKH } from './p2wpkh'

export * from './address'
export * from './p2pkh'
export * from './p2sh'
export * from './p2wpkh'
export * from './p2wsh'

/**
 * @param net to be validated against the decoded one from the raw address
 * @param address raw human readable address (utf-8)
 * @returns DefiAddress or a child class
 */
function from (address: string): Address {
  let guess: Address = P2PKH.from(address)
  if (guess.valid) {
    return guess
  }

  guess = P2SH.from(address)
  if (guess.valid) {
    return guess
  }

  guess = P2WPKH.from(address)
  if (guess.valid) {
    return guess
  }

  // default, return `address.valid` can be false
  guess = P2WSH.from(address)
  return guess
}

export const DeFiAddress = {
  from
}
