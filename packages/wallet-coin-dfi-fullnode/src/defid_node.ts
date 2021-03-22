import BigNumber from 'bignumber.js';
import { DfiHdNode } from '@defichain/wallet-coin-dfi'
import { ApiClient } from "@defichain/api-core";
import { HdNode } from "@defichain/wallet-coin";

/**
 * DeFi Blockchain HdNode implementation connecting to a local DeFi Daemon, 'defid'
 */
export class FullNodeDfiHdNode implements DfiHdNode<FullNodeDfiHdNode> {
  private readonly node: HdNode<any>
  private readonly apiClient: ApiClient

  /**
   * @param node the HdNode implementation to use for FullNodeDfiHdNode keeping this implementation agnostic.
   * @param apiClient connected local rpc based api client
   */
  constructor (node: HdNode<any>, apiClient: ApiClient) {
    this.node = node;
    this.apiClient = apiClient;
  }

  async getUnspent (): Promise<BigNumber> {
    const address = await this.getAddress('bech32')
    const result = await this.apiClient.call('listunspent', [0, 9999999, [address], true], 'bignumber')
    // TODO(fuxingloh): listunspent or a better way to implement this
    throw new Error('Method not implemented.');
  }

  getAddress (format: 'bech32' | 'p2sh' | 'legacy'): Promise<string> {
    // TODO(fuxingloh): dfi address implementation
    throw new Error('Method not implemented.');
  }

  publicKey (): Promise<Buffer> {
    return this.node.publicKey()
  }

  privateKey (): Promise<Buffer> {
    return this.node.privateKey()
  }

  async derive (index: number): Promise<FullNodeDfiHdNode> {
    const node = await this.node.derive(index)
    return new FullNodeDfiHdNode(node, this.apiClient)
  }

  async deriveHardened (index: number): Promise<FullNodeDfiHdNode> {
    const node = await this.node.deriveHardened(index)
    return new FullNodeDfiHdNode(node, this.apiClient)
  }

  async derivePath (path: string): Promise<FullNodeDfiHdNode> {
    const node = await this.node.derivePath(path)
    return new FullNodeDfiHdNode(node, this.apiClient)
  }

  sign (hash: Buffer, lowR?: boolean): Promise<Buffer> {
    return this.node.sign(hash, lowR)
  }

  verify (hash: Buffer, signature: Buffer): Promise<boolean> {
    return this.node.verify(hash, signature)
  }
}
