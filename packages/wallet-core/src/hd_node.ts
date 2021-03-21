/**
 * Stateless BIP32 Hierarchical Deterministic Node
 * https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
 */
export interface HdNode<T extends HdNode<any>> {

  /**
   * Get the public key Buffer of HdNode
   */
  publicKey (): Promise<Buffer>

  /**
   * Get the private key Buffer of HdNode
   * Allowed to fail when it is neutered or if it is hardware key.
   */
  privateKey (): Promise<Buffer>

  /**
   * Derive a node in this hierarchical key tree.
   * @param index of the node to derive
   */
  derive (index: number): Promise<T>

  /**
   * Derive a hardened node in this hierarchical key tree.
   * @param index of the hardened node to derive
   */
  deriveHardened (index: number): Promise<T>

  /**
   * @param path to derive
   * @example
   * m/0'
   * m/0'/100
   * m/44'/0'/0'/0/0
   */
  derivePath (path: string): Promise<T>

  /**
   * Sign the hash
   *
   * @param hash to sign
   * @param lowR whether to create signature with Low R values,
   * should be defaulted to true
   * can be ignored if implementation class is unable to specific this option.
   */
  sign (hash: Buffer, lowR?: boolean): Promise<Buffer>;

  /**
   * Verify the signature of a hash with this node/address
   *
   * @param hash to verify
   * @param signature to verify
   */
  verify (hash: Buffer, signature: Buffer): Promise<boolean>;

  // TODO(fuxingloh): Additional interface that can be implemented, ignored for now
  //  - neuter
  //  - isNeutered
  //  - toWIF
  //  - chainCode
  //  - depth/index
  //  - fingerprint
  //  - toBase58
  //  - parentFingerprint
}
