import { getNetwork, NetworkName } from './Network'

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BitcoinJsLib {
  export interface Network {
    messagePrefix: string
    bech32: string
    bip32: Bip32
    pubKeyHash: number
    scriptHash: number
    wif: number
  }

  interface Bip32 {
    public: number
    private: number
  }
}

/**
 * https://github.com/bitcoinjs/bip32/blob/ccc8fa7eedd7ff072f2f5c2d1ef89f0222391235/src/bip32.js#L18-L28
 *
 * @param network name
 * @return Network specific DeFi configuration in BitcoinJsLib.Network interface
 */
export function getNetworkBitcoinJsLib (network: NetworkName): BitcoinJsLib.Network {
  const jellyfish = getNetwork(network)

  return {
    messagePrefix: jellyfish.messagePrefix,
    bech32: jellyfish.bech32.hrp,
    bip32: {
      public: jellyfish.bip32.publicPrefix,
      private: jellyfish.bip32.privatePrefix
    },
    pubKeyHash: jellyfish.pubKeyHashPrefix,
    scriptHash: jellyfish.scriptHashPrefix,
    wif: jellyfish.wifPrefix
  }
}
