import { OP_CODES, OP_PUSHDATA, Script } from '@defichain/jellyfish-transaction'
import { getNetwork, NetworkName } from '@defichain/jellyfish-network'
import { toBase58Check } from './base58check'

function isScriptP2PKH (script: Script): boolean {
  return script.stack.length === 5 &&
    script.stack[0].type === OP_CODES.OP_DUP.type &&
    script.stack[1].type === OP_CODES.OP_HASH160.type &&
    script.stack[2].type === 'OP_PUSHDATA' && (script.stack[2] as OP_PUSHDATA).length() === 20 &&
    script.stack[3].type === OP_CODES.OP_EQUALVERIFY.type &&
    script.stack[4].type === OP_CODES.OP_CHECKSIG.type
}

export function fromScriptP2PKH (script: Script, network: NetworkName): string | undefined {
  if (!isScriptP2PKH(script)) {
    return undefined
  }

  const hash = script.stack[2] as OP_PUSHDATA
  const buffer = Buffer.from(hash.hex, 'hex')
  const prefix = getNetwork(network).scriptHashPrefix
  return toBase58Check(buffer, prefix)
}
