import { WalletEllipticPair } from './wallet_elliptic_pair'

/**
 * WalletHdNode extends EllipticPair with additional interface to sign transaction.
 *
 * WalletHdNode uses a managed wallet design where defaults are decided by the implementation.
 * Keeping the WalletHdNode to conventional defaults and options to none.
 *
 *
 * @see BIP32 Hierarchical Deterministic Wallets
 * @see BIP44 Multi-Account Hierarchy for Deterministic Wallets
 */
export interface WalletHdNode extends WalletEllipticPair {

}

/**
 * WalletHdNode uses the provider model to allow jellyfish-wallet to derive/provide a WalletHdNode from any sources.
 * This design keep WalletHdNode derivation agnostic of any implementation, allowing a lite
 * implementation where WalletHdNode are derived on demand.
 */
export interface WalletHdNodeProvider<T extends WalletHdNode> {

  /**
   * @param {string} path to derive
   * @return WalletHdNode
   */
  derive: (path: string) => T
}
