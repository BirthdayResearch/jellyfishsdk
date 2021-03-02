import {JellyfishJsonRpc} from '@defichain/jellyfish-jsonrpc'

export const Jellyfish = {
  /**
   * Initialize a DeFiChain client and use jsonrpc for interfacing
   *
   * @param url
   */
  jsonrpc(url: string): JellyfishJsonRpc {
    return new JellyfishJsonRpc(url)
  },
}

export default Jellyfish
