import wif from 'wif'
import { EllipticPair, Elliptic } from './elliptic'

interface DecodedWIF {
  readonly version: number
  readonly privateKey: Buffer
  readonly compressed: boolean
}

/**
 * @param {string} wifEncoded private key
 * @param {number} version network to optionally validate
 * @return {DecodedWIF}
 * @throws Error invalid network version if version mismatch
 */
function decode (wifEncoded: string, version?: number): DecodedWIF {
  return wif.decode(wifEncoded, version)
}

/**
 * Get a EllipticPair from WIF encoded private key
 *
 * @param {string} wifEncoded private key
 * @param {number} version network to optionally validate
 * @return {EllipticPair}
 * @throws Error invalid network version if version mismatch
 */
function decodeAsEllipticPair (wifEncoded: string, version?: number): EllipticPair {
  const { privateKey } = decode(wifEncoded, version)
  return Elliptic.fromPrivKey(privateKey)
}

/**
 * @param {number} version network version to encoded WIF with
 * @param {Buffer} privKey to encode
 * @return {string} encoded WIF
 */
function encode (version: number, privKey: Buffer): string {
  return wif.encode(version, privKey, true)
}

export const WIF = {

  /**
   * @param {string} wif private key
   * @param {number} [version] network to optionally validate
   * @return {DecodedWIF}
   * @throws Error invalid network version if version mismatch
   */
  decode (wif: string, version?: number): DecodedWIF {
    return decode(wif, version)
  },

  /**
   * @param {number} version network version to encoded WIF with
   * @param {Buffer} privKey to encode
   * @return {string} encoded WIF
   */
  encode (version: number, privKey: Buffer): string {
    return encode(version, privKey)
  },

  /**
   * Get a EllipticPair from WIF encoded private key
   *
   * @param {string} wif private key
   * @param {number} [version] network to optionally validate
   * @return EllipticPair
   * @throws Error invalid network version if version mismatch
   */
  asEllipticPair (wif: string, version?: number): EllipticPair {
    return decodeAsEllipticPair(wif, version)
  }
}
