import { OP_CODES, OP_PUSHDATA, Script } from '@defichain/jellyfish-transaction'
import { getNetwork, NetworkName } from '@defichain/jellyfish-network'
import { DecodedBase58Check, toBase58Check } from './Base58Check'

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
  const prefix = getNetwork(network).pubKeyHashPrefix
  return toBase58Check(buffer, prefix)
}

function isBase58CheckP2PKH (decoded: DecodedBase58Check, network: NetworkName): boolean {
  return decoded.prefix === getNetwork(network).pubKeyHashPrefix &&
    decoded.buffer.length === 20
}

export function fromBase58CheckP2PKH (decoded: DecodedBase58Check, network: NetworkName): Script | undefined {
  if (isBase58CheckP2PKH(decoded, network)) {
    return undefined
  }

  return {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA(Buffer.from(decoded.buffer), 'little'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  }
}
