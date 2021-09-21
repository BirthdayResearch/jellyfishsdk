import { SmartBuffer } from 'smart-buffer'
import { Script, toOPCodes } from '@defichain/jellyfish-transaction'
import { NetworkName } from '@defichain/jellyfish-network'
import { fromScriptP2WPKH } from './P2WPKH'
import { DecodedAddress } from './DecodedAddress'
import { fromScriptP2WSH } from './P2WSH'
import { fromScriptP2SH } from './P2SH'
import { fromScriptP2PKH } from './P2PKH'

export { DecodedAddress }

/**
 * Convert a script to address, this operation requires the network to be known.
 * A script is network agnostic while address is prefixed with network unique human readable part.
 *
 * @param {Script} script to convert into address
 * @param {NetworkName} network to prefix human readable part of the address
 * @return {DecodedAddress | undefined} DecodedAddress if is a recognizable, undefined if fail to parse
 */
export function fromScript (script: Script, network: NetworkName): DecodedAddress | undefined {
  const p2wpkh = fromScriptP2WPKH(script, network)
  if (p2wpkh !== undefined) {
    return {
      type: 'p2wpkh',
      address: p2wpkh,
      script: script,
      network: network
    }
  }

  const p2wsh = fromScriptP2WSH(script, network)
  if (p2wsh !== undefined) {
    return {
      type: 'p2wsh',
      address: p2wsh,
      script: script,
      network: network
    }
  }

  const p2pkh = fromScriptP2PKH(script, network)
  if (p2pkh !== undefined) {
    return {
      type: 'p2pkh',
      address: p2pkh,
      script: script,
      network: network
    }
  }

  const p2sh = fromScriptP2SH(script, network)
  if (p2sh !== undefined) {
    return {
      type: 'p2sh',
      address: p2sh,
      script: script,
      network: network
    }
  }

  return undefined
}

/**
 * Convert a script to address, this operation requires the network to be known.
 * A script is network agnostic while address is prefixed with network unique human readable part.
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
