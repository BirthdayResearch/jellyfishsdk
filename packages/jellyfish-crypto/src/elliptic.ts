import ecc from 'tiny-secp256k1'
import { DERSignature } from './der'

/**
 * Provides the interface for an elliptic curve pair to sign and verify hash.
 * This interface is Promise based to allow async operations, this is required for hardware or network based elliptic
 * curve operation. Everything must be implemented in little endian because DeFi Blockchain uses LE.
 *
 * Signature must be encoded with Distinguished Encoding Rules.
 * @see https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki
 */
export interface EllipticPair {
  /**
   * @return Promise<Buffer> compressed public key
   */
  publicKey: () => Promise<Buffer>

  /**
   * Allowed to fail if EllipticPair does not provide hardware key
   * @return Promise<Buffer> privateKey
   */
  privateKey: () => Promise<Buffer>

  /**
   * @param hash {Buffer} to sign
   * @return {Buffer} signature in DER format, SIGHASHTYPE not included
   * @see https://tools.ietf.org/html/rfc6979
   * @see https://github.com/bitcoin/bitcoin/pull/13666
   */
  sign: (hash: Buffer) => Promise<Buffer>

  /**
   * @param hash {Buffer} to verify with signature
   * @param derSignature {Buffer} of the hash in encoded with DER, SIGHASHTYPE must not be included
   * @return boolean validity of signature of the hash
   */
  verify: (hash: Buffer, derSignature: Buffer) => Promise<boolean>
}

/**
 * Wraps secp256k1 from 'tiny-secp256k1' & 'bip66'
 */
class SECP256K1 implements EllipticPair {
  private readonly privKey: Buffer
  private readonly pubKey: Buffer

  constructor (privKey: Buffer) {
    this.privKey = privKey
    const pubKey = ecc.pointFromScalar(privKey, true)
    if (pubKey === null) {
      throw new Error('point at infinity')
    }
    this.pubKey = pubKey
  }

  async privateKey (): Promise<Buffer> {
    return this.privKey
  }

  async publicKey (): Promise<Buffer> {
    return this.pubKey
  }

  async sign (hash: Buffer): Promise<Buffer> {
    let signature = ecc.sign(hash, this.privKey)

    const extraData = Buffer.alloc(32, 0)
    let counter = 0

    // if first try is lowR, skip the loop, for second try and on, add extra entropy counting up
    while (signature[0] > 0x7f) {
      counter++
      extraData.writeUIntLE(counter, 0, 6)
      // @ts-expect-error
      signature = ecc.signWithEntropy(hash, this.privKey, extraData)
    }
    return DERSignature.encode(signature)
  }

  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    const signature = DERSignature.decode(derSignature)
    return ecc.verify(hash, this.pubKey, signature)
  }
}

/**
 * @param buffer in little endian
 * @return SECP256K1 EllipticPair
 */
export function getEllipticPairFromPrivateKey (buffer: Buffer): EllipticPair {
  return new SECP256K1(buffer)
}
