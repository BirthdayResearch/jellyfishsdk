import { getNetwork, NetworkName } from './Network'
import { BitcoinJsLibNetwork } from '@defichain/bitcoinjs'

/**
 * https://github.com/bitcoinjs/bip32/blob/ccc8fa7eedd7ff072f2f5c2d1ef89f0222391235/src/bip32.js#L18-L28
 *
 * @param network name
 * @return Network specific DeFi configuration in BitcoinJsLibNetwork interface
 */
export function getNetworkBitcoinJsLib (network: NetworkName): BitcoinJsLibNetwork {
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
