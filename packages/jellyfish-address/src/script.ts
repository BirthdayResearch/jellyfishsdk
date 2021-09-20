import { SmartBuffer } from 'smart-buffer'
import { CScript, Script } from '@defichain/jellyfish-transaction'
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
 * @param {string} hex of the script to convert into address
 * @param {NetworkName} network to prefix human readable part of the address
 * @return {string | undefined} address if is a recognizable, undefined if fail to parse
 */
export function fromScriptHex (hex: string, network: NetworkName): string | undefined {
  const buffer = Buffer.from(hex, 'hex')
  return fromScriptBuffer(buffer, network)
}

/**
 * Convert a script to address, this operation requires the network to be known.
 * A script is network agnostic while address is prefixed with network unique human readable part.
 *
 * @param {Buffer} buffer of the script to convert into address
 * @param {NetworkName} network to prefix human readable part of the address
 * @return {string | undefined} address if is a recognizable, undefined if fail to parse
 */
export function fromScriptBuffer (buffer: Buffer, network: NetworkName): string | undefined {
  const script = new CScript(SmartBuffer.fromBuffer(buffer))
  return fromScript(script, network)
}
