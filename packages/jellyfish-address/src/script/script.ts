import { SmartBuffer } from 'smart-buffer'
import { Script, toOPCodes } from '@defichain/jellyfish-transaction'
import { NetworkName } from '@defichain/jellyfish-network'
import { fromScriptP2WPKH } from './p2wpkh'
import { Address } from './address'
import { fromScriptP2WSH } from './p2wsh'

/**
 * Convert a script to address, this operation requires the network to be known.
 * A script is network agnostic while address is prefixed with network unique human readable part.
 *
 * @param {Script} script to convert into address
 * @param {NetworkName} network to prefix human readable part of the address
 * @return {string | undefined} address if is a recognizable, undefined if fail to parse
 */
export function fromScript (script: Script, network: NetworkName): Address | undefined {
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

  return undefined
}

/**
 * Convert a script to address, this operation requires the network to be known.
 * A script is network agnostic while address is prefixed with network unique human readable part.
 *
 * @param {string} hex of the script to convert into address, without VarUInt length
 * @param {NetworkName} network to prefix human readable part of the address
 * @return {string | undefined} address if is a recognizable, undefined if fail to parse
 */
export function fromScriptHex (hex: string, network: NetworkName): Address | undefined {
  const buffer = Buffer.from(hex, 'hex')
  const script: Script = {
    stack: toOPCodes(SmartBuffer.fromBuffer(buffer))
  }
  return fromScript(script, network)
}
