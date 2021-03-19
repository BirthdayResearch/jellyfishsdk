export interface Network {
  /**
   * For signing message with RPC
   * - 'signmessage'
   * - 'verifymessage'
   */
  messagePrefix: string
  /**
   * Wallet import format
   * base58Prefixes.SECRET_KEY
   */
  wif: number
  /**
   * Hierarchical Deterministic Wallet
   */
  bip32: {
    /**
     * base58Prefixes.EXT_PUBLIC_KEY
     */
    public: number
    /**
     * base58Prefixes.EXT_SECRET_KEY
     */
    private: number
  }
  /**
   * Version prefix used for bech32
   */
  bech32: string
  /**
   * base58Prefixes.PUBKEY_ADDRESS
   */
  pubKeyHash: number
  /**
   * base58Prefixes.SCRIPT_ADDRESS
   */
  scriptHash: number
}

export const MainNet: Network = {
  messagePrefix: '\x15Defi Signed Message:\n',
  bech32: 'df',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4
  },
  pubKeyHash: 0x12,
  scriptHash: 0x5a,
  wif: 0x80
}

export const TestNet: Network = {
  messagePrefix: '\x15Defi Signed Message:\n',
  bech32: 'tf',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  pubKeyHash: 0xf,
  scriptHash: 0x80,
  wif: 0xef
}

export const RegTest: Network = {
  messagePrefix: '\x15Defi Signed Message:\n',
  bech32: 'bcrt',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef
}
