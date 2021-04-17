import wif from 'wif'
import { EllipticPair, getEllipticPairFromPrivateKey } from './elliptic'

interface DecodedWIF {
  readonly version: number
  readonly privateKey: Buffer
  readonly compressed: boolean
}

/**
 * @param {string} wifEncoded private key
 * @param {number} version network to optionally validate
 * @return DecodedWIF
 * @throws Error invalid network version if version mismatch
 */
export function decode (wifEncoded: string, version?: number): DecodedWIF {
  return wif.decode(wifEncoded, version)
}

/**
 * Get a EllipticPair from WIF encoded private key
 *
 * @param {string} wifEncoded private key
 * @param {number} version network to optionally validate
 * @return EllipticPair
 * @throws Error invalid network version if version mismatch
 */
export function decodeAsEllipticPair (wifEncoded: string, version?: number): EllipticPair {
  const { privateKey } = decode(wifEncoded, version)
  return getEllipticPairFromPrivateKey(privateKey)
}

/**
 * @param {number} version network version to encoded WIF with
 * @param {Buffer} privKey to encode
 * @return {string} encoded WIF
 */
export function encode (version: number, privKey: Buffer): string {
  return wif.encode(version, privKey, true)
}
