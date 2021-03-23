import createHash from "create-hash";
import { bech32 } from 'bech32'

function ripemd160 (buffer: Buffer): Buffer {
  return createHash('rmd160').update(buffer).digest()
}

function sha256 (buffer: Buffer): Buffer {
  return createHash('sha256').update(buffer).digest()
}

// TODO(fuxingloh): legacy implementation
// function toBase58Check (hash: Buffer, version: number) {
//   const payload = Buffer.allocUnsafe(21)
//   payload.writeUInt8(version, 0)
//   hash.copy(payload, 1)
//
//   return bs58check.encode(payload)
// }

// TODO(fuxingloh): implement type check to improve reliability

/**
 * @param pubKey to format into bech32
 * @param hrp human readable part
 * df   - DeFi MainNet
 * tf   - DeFi TestNet
 * bcrt - DeFi RegTest
 */
export function toBech32 (pubKey: Buffer, hrp: 'df' | 'tf' | 'bcrt' | string): string {
  const hash = ripemd160(sha256(pubKey))
  const words = bech32.toWords(hash);
  words.unshift(0x00);
  return bech32.encode(hrp, words);
}
