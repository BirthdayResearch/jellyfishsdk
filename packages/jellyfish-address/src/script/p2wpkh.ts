import { OP_CODES, OP_PUSHDATA, Script } from '@defichain/jellyfish-transaction'
import { getNetwork, NetworkName } from '@defichain/jellyfish-network'
import { toBech32 } from './bech32'

function isScriptP2WPKH (script: Script): boolean {
  return script.stack.length === 2 &&
    script.stack[0].type === OP_CODES.OP_0.type &&
    script.stack[1].type === 'OP_PUSHDATA' && (script.stack[1] as OP_PUSHDATA).length() === 20
}

export function fromScriptP2WPKH (script: Script, network: NetworkName): string | undefined {
  if (!isScriptP2WPKH(script)) {
    return undefined
  }

  const hash = script.stack[1] as OP_PUSHDATA
  const buffer = Buffer.from(hash.hex, 'hex')
  const hrp = getNetwork(network).bech32.hrp
  return toBech32(buffer, hrp, 0x00)
}
