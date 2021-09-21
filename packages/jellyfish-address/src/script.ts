import { SmartBuffer } from 'smart-buffer'
import { Script, toOPCodes } from '@defichain/jellyfish-transaction'
import { NetworkName } from '@defichain/jellyfish-network'
import { fromScriptP2WPKH } from './p2wpkh'

/**
 * Convert a script to address, this operation requires the network to be known.
 * A script is network agnostic while address is prefixed with network unique human readable part.
 *
 * @param {Script} script to convert into address
 * @param {NetworkName} network to prefix human readable part of the address
 * @return {string | undefined} address if is a recognizable, undefined if fail to parse
 */
export function fromScript (script: Script, network: NetworkName): string | undefined {
  const p2wpkh = fromScriptP2WPKH(script, network)
  if (p2wpkh !== undefined) {
    return p2wpkh
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
export function fromScriptHex (hex: string, network: NetworkName): string | undefined {
  const buffer = Buffer.from(hex, 'hex')
  const stack = toOPCodes(SmartBuffer.fromBuffer(buffer))
  return fromScript({ stack: stack }, network)
}
