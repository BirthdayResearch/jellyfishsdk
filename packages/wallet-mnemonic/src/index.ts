import { HdNode } from "@defichain/wallet-coin";
import bip32, { BIP32Interface } from "bip32";
import bip39 from 'bip39'

/**
 * Bip32 Options, version bytes and WIF format. Unique to each chain.
 *
 * https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#serialization-format
 */
export interface Bip32Options {
  bip32: {
    // base58Prefixes.EXT_PUBLIC_KEY
    public: number;
    // base58Prefixes.EXT_SECRET_KEY
    private: number;
  }
  // base58Prefixes.SECRET_KEY
  wif: number;
}

/**
 * @param mnemonic sentence to validate
 */
export function validateMnemonic (mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic)
}

/**
 * Generate a random mnemonic code of length, uses crypto.randomBytes under the hood.
 * Defaults to 256-bits of entropy.
 * https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
 *
 * |  ENT  | CS | ENT+CS |  MS  |
 * +-------+----+--------+------+
 * |  128  |  4 |   132  |  12  |
 * |  160  |  5 |   165  |  15  |
 * |  192  |  6 |   198  |  18  |
 * |  224  |  7 |   231  |  21  |
 * |  256  |  8 |   264  |  24  |
 *
 * @param length the sentence length of the mnemonic code
 */
export function generateMnemonic (length: 12 | 15 | 18 | 21 | 24 = 24): string {
  return bip39.generateMnemonic(length)
}

/**
 * MnemonicHdNode implements the HdNode from wallet-coin; a CoinType-agnostic HD Wallet for non custodial DeFi.
 * Purpose [44'] / CoinType-agnostic [n] / Account [n] / Chain (ignored for now) [0] / Addresses [n]
 *
 * - BIP32 Hierarchical Deterministic Wallets
 * - BIP39 Mnemonic code for generating deterministic keys
 * - BIP44 Multi-Account Hierarchy for Deterministic Wallets
 */
export class MnemonicHdNode implements HdNode<MnemonicHdNode> {
  private readonly node: BIP32Interface

  /**
   * @param mnemonic code of the hd node
   * @param options for chain agnostic generation of public/private keys
   */
  public static fromMnemonic (mnemonic: string, options: Bip32Options): MnemonicHdNode {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    return this.fromSeed(seed, options)
  }

  /**
   * @param seed of the hd node
   * @param options for chain agnostic generation of public/private keys
   */
  public static fromSeed (seed: Buffer, options: Bip32Options): MnemonicHdNode {
    const node = bip32.fromSeed(seed, options)
    return new MnemonicHdNode(node)
  }

  private constructor (node: BIP32Interface) {
    this.node = node;
  }

  /**
   * Get the public key Buffer of the HdNode
   */
  async publicKey (): Promise<Buffer> {
    return this.node.publicKey
  }

  /**
   * Get privateKey Buffer of the HdNode, allowed to fail if neutered.
   */
  async privateKey (): Promise<Buffer> {
    if (this.node.privateKey) {
      return this.node.privateKey
    }
    throw new Error("neutered hd node");
  }

  /**
   * Derive a node in this hierarchical key tree.
   * @param index of the node to derive
   */
  async derive (index: number): Promise<MnemonicHdNode> {
    const node = this.node.derive(index)
    return new MnemonicHdNode(node)
  }

  /**
   * Derive a hardened node in this hierarchical key tree.
   * @param index of the hardened node to derive
   */
  async deriveHardened (index: number): Promise<MnemonicHdNode> {
    const node = this.node.deriveHardened(index)
    return new MnemonicHdNode(node)
  }

  /**
   * @param path to derive
   * @example
   * m/0'
   * m/0'/100
   * m/44'/0'/0'/0/0
   */
  async derivePath (path: string): Promise<MnemonicHdNode> {
    const node = this.node.derivePath(path)
    return new MnemonicHdNode(node)
  }

  /**
   * @param hash to sign
   * @param lowR whether to create signature with Low R values.
   */
  async sign (hash: Buffer, lowR?: boolean): Promise<Buffer> {
    return this.node.sign(hash, lowR);
  }

  /**
   * @param hash to verify
   * @param signature to verify
   */
  async verify (hash: Buffer, signature: Buffer): Promise<boolean> {
    return this.node.verify(hash, signature)
  }
}
