/**
 * Networks available in DeFi Blockchain.
 */
export type NetworkName = Network['name']

/**
 * Network specific DeFi configuration.
 * They can be found in DeFiCh/ain project in file chainparams.cpp, under base58Prefixes
 */
export interface Network {
  name: 'mainnet' | 'testnet' | 'regtest' | 'devnet' | 'changi'
  bech32: {
    /** bech32 human readable part */
    hrp: 'df' | 'tf' | 'bcrt'
  }
  bip32: {
    /** base58Prefixes.EXT_PUBLIC_KEY */
    publicPrefix: 0x0488b21e | 0x043587cf
    /** base58Prefixes.EXT_SECRET_KEY */
    privatePrefix: 0x0488ade4 | 0x04358394
  }
  /** base58Prefixes.SECRET_KEY */
  wifPrefix: 0x80 | 0xef
  /** base58Prefixes.PUBKEY_ADDRESS */
  pubKeyHashPrefix: 0x12 | 0xf | 0x6f
  /** base58Prefixes.SCRIPT_ADDRESS */
  scriptHashPrefix: 0x5a | 0x80 | 0xc4
  /** For message signing. */
  messagePrefix: '\x15Defi Signed Message:\n'

  ports: {
    rpc: number
    p2p: number
  }
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
    case 'devnet':
      return DevNet
    case 'regtest':
      return RegTest
    case 'changi':
      return Changi
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
  messagePrefix: '\x15Defi Signed Message:\n',
  ports: {
    rpc: 8554,
    p2p: 8555
  }
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
  messagePrefix: '\x15Defi Signed Message:\n',
  ports: {
    rpc: 18554,
    p2p: 18555
  }
}

/**
 * DevNet specific DeFi configuration.
 */
export const DevNet: Network = {
  ...TestNet,
  name: 'devnet',
  ports: {
    rpc: 21554,
    p2p: 21555
  }
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
  messagePrefix: '\x15Defi Signed Message:\n',
  ports: {
    rpc: 19554,
    p2p: 19555
  }
}

/**
 * Changi specific DeFi configuration.
 */
export const Changi: Network = {
  ...TestNet,
  name: 'changi',
  ports: {
    rpc: 20554,
    p2p: 20555
  }
}
