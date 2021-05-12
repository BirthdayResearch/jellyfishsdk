
/**
 * Network specific DeFi configuration.
 * They can be found in DeFiCh/ain project in file chainparams.cpp, under base58Prefixes
 */
export type NetworkName = 'mainnet' | 'testnet' | 'regtest'
export interface Network {
  name: NetworkName
  bech32: {
    /** bech32 human readable part */
    hrp: string
  }
  bip32: {
    /** base58Prefixes.EXT_PUBLIC_KEY */
    publicPrefix: number
    /** base58Prefixes.EXT_SECRET_KEY */
    privatePrefix: number
  }
  /** base58Prefixes.SECRET_KEY */
  wifPrefix: number
  /** base58Prefixes.PUBKEY_ADDRESS */
  pubKeyHashPrefix: number
  /** base58Prefixes.SCRIPT_ADDRESS */
  scriptHashPrefix: number
  /** For message signing. */
  messagePrefix: string
}

/**
 * @param network name
 * @return Network specific DeFi configuration
 */
export function getNetwork (network: NetworkName): Network {
  switch (network) {
    case 'mainnet':
      return MainNet
    case 'testnet':
      return TestNet
    case 'regtest':
      return RegTest
    default:
      throw new Error(`${network as string} network not found`)
  }
}

/**
 * MainNet specific DeFi configuration.
 */
export const MainNet: Network = {
  name: 'mainnet',
  bech32: {
    hrp: 'df'
  },
  bip32: {
    publicPrefix: 0x0488b21e,
    privatePrefix: 0x0488ade4
  },
  wifPrefix: 0x80,
  pubKeyHashPrefix: 0x12,
  scriptHashPrefix: 0x5a,
  messagePrefix: '\x15Defi Signed Message:\n'
}

/**
 * TestNet specific DeFi configuration.
 */
export const TestNet: Network = {
  name: 'testnet',
  bech32: {
    hrp: 'tf'
  },
  bip32: {
    publicPrefix: 0x043587cf,
    privatePrefix: 0x04358394
  },
  wifPrefix: 0xef,
  pubKeyHashPrefix: 0xf,
  scriptHashPrefix: 0x80,
  messagePrefix: '\x15Defi Signed Message:\n'
}

/**
 * RegTest specific DeFi configuration.
 */
export const RegTest: Network = {
  name: 'regtest',
  bech32: {
    hrp: 'bcrt'
  },
  bip32: {
    publicPrefix: 0x043587cf,
    privatePrefix: 0x04358394
  },
  wifPrefix: 0xef,
  pubKeyHashPrefix: 0x6f,
  scriptHashPrefix: 0xc4,
  messagePrefix: '\x15Defi Signed Message:\n'
}
