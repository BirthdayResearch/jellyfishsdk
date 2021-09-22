import { OP_CODES, OP_PUSHDATA, Script } from '@defichain/jellyfish-transaction'
import { getNetwork, NetworkName } from '@defichain/jellyfish-network'
import { DecodedBech32, toBech32 } from './Bech32'

function isScriptP2WSH (script: Script): boolean {
  return script.stack.length === 2 &&
    script.stack[0].type === OP_CODES.OP_0.type &&
    script.stack[1].type === 'OP_PUSHDATA' && (script.stack[1] as OP_PUSHDATA).length() === 32
}

export function fromScriptP2WSH (script: Script, network: NetworkName): string | undefined {
  if (!isScriptP2WSH(script)) {
    return undefined
  }

  const hash = script.stack[1] as OP_PUSHDATA
  const buffer = Buffer.from(hash.hex, 'hex')
  const hrp = getNetwork(network).bech32.hrp
  return toBech32(buffer, hrp, 0x00)
}

function isBech32P2WSH (decoded: DecodedBech32, network: NetworkName): boolean {
  return decoded.hrp === getNetwork(network).bech32.hrp &&
    decoded.version !== 0x00 &&
    decoded.buffer.length === 32
}

export function fromBech32P2WSH (decoded: DecodedBech32, network: NetworkName): Script | undefined {
  if (isBech32P2WSH(decoded, network)) {
    return undefined
  }

  return {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA(Buffer.from(decoded.buffer), 'little')
    ]
  }
}
