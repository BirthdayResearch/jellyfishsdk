import { SmartBuffer } from 'smart-buffer'
import { Script, toOPCodes } from '@defichain/jellyfish-transaction'
import { NetworkName } from '@defichain/jellyfish-network'
import { fromBech32P2WPKH, fromScriptP2WPKH } from './P2WPKH'
import { fromBech32P2WSH, fromScriptP2WSH } from './P2WSH'
import { fromBase58CheckP2SH, fromScriptP2SH } from './P2SH'
import { fromBase58CheckP2PKH, fromScriptP2PKH } from './P2PKH'
import { fromBech32 } from './Bech32'
import { fromBase58Check } from './Base58Check'

/**
 * Known Address Types
 */
export enum AddressType {
  /**
   * Pay to Witness Public Key Hash
   * Native SEGWIT with Bech32
   */
  P2WPKH = 'P2WPKH',
  /**
   * Pay to Witness Script Hash
   * Native SEGWIT with Bech32
   */
  P2WSH = 'P2WSH',
  /**
   * Pay to Script Hash
   */
  P2SH = 'P2SH',
  /**
   * Pay to Public Key Hash
   * Also known as legacy
   */
  P2PKH = 'P2PKH',
}

export interface DecodedAddress {
  type: AddressType
  address: string
  script: Script
  network: NetworkName
}

/**
 * Convert a address to script, this operation requires the network to be known.
 * A script is network agnostic while the address is prefixed with the network's unique human readable part.
 *
 * @param {string} address to convert into Script
 * @param {NetworkName} network to prefix human readable part of the address
 * @return {DecodedAddress | undefined} DecodedAddress if is a recognizable, undefined if fail to parse
 */
export function fromAddress (address: string, network: NetworkName): DecodedAddress | undefined {
  try {
    const decodedBech32 = fromBech32(address)

    const p2wpkh = fromBech32P2WPKH(decodedBech32, network)
    if (p2wpkh !== undefined) {
      return {
        type: AddressType.P2WPKH,
        address: address,
        script: p2wpkh,
        network: network
      }
    }

    const p2wsh = fromBech32P2WSH(decodedBech32, network)
    if (p2wsh !== undefined) {
      return {
        type: AddressType.P2WSH,
        address: address,
        script: p2wsh,
        network: network
      }
    }
  } catch (err) {
  }

  try {
    const decodedBase58Check = fromBase58Check(address)

    const p2pkh = fromBase58CheckP2PKH(decodedBase58Check, network)
    if (p2pkh !== undefined) {
      return {
        type: AddressType.P2PKH,
        address: address,
        script: p2pkh,
        network: network
      }
    }

    const p2sh = fromBase58CheckP2SH(decodedBase58Check, network)
    if (p2sh !== undefined) {
      return {
        type: AddressType.P2SH,
        address: address,
        script: p2sh,
        network: network
      }
    }
  } catch (err) {
  }

  return undefined
}

/**
 * Convert a script to address, this operation requires the network to be known.
 * A script is network agnostic while the address is prefixed with the network's unique human readable part.
 *
 * @param {Script} script to convert into address
 * @param {NetworkName} network to prefix human readable part of the address
 * @return {DecodedAddress | undefined} DecodedAddress if is a recognizable, undefined if fail to parse
 */
export function fromScript (script: Script, network: NetworkName): DecodedAddress | undefined {
  const p2wpkh = fromScriptP2WPKH(script, network)
  if (p2wpkh !== undefined) {
    return {
      type: AddressType.P2WPKH,
      address: p2wpkh,
      script: script,
      network: network
    }
  }

  const p2wsh = fromScriptP2WSH(script, network)
  if (p2wsh !== undefined) {
    return {
      type: AddressType.P2WSH,
      address: p2wsh,
      script: script,
      network: network
    }
  }

  const p2pkh = fromScriptP2PKH(script, network)
  if (p2pkh !== undefined) {
    return {
      type: AddressType.P2PKH,
      address: p2pkh,
      script: script,
      network: network
    }
  }

  const p2sh = fromScriptP2SH(script, network)
  if (p2sh !== undefined) {
    return {
      type: AddressType.P2SH,
      address: p2sh,
      script: script,
      network: network
    }
  }

  return undefined
}

/**
 * Convert a script to address, this operation requires the network to be known.
 * A script is network agnostic while the address is prefixed with the network's unique human readable part.
 *
 * @param {string} hex of the script to convert into address, without VarUInt length
 * @param {NetworkName} network to prefix human readable part of the address
 * @return {DecodedAddress | undefined} DecodedAddress if is a recognizable, undefined if fail to parse
 */
export function fromScriptHex (hex: string, network: NetworkName): DecodedAddress | undefined {
  const buffer = Buffer.from(hex, 'hex')
  const script: Script = {
    stack: toOPCodes(SmartBuffer.fromBuffer(buffer))
  }
  return fromScript(script, network)
}
