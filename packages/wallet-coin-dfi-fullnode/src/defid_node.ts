import BigNumber from 'bignumber.js';
import { HdNode } from "@defichain/wallet-coin";
import { DfiHdNode, DfiWalletOptions } from '@defichain/wallet-coin-dfi'
import { ApiClient } from "@defichain/api-core";

/**
 * DeFi Blockchain HdNode implementation connecting to a local DeFi Daemon, 'defid'
 */
export class FullNodeDfiHdNode extends DfiHdNode<FullNodeDfiHdNode> {
  private readonly node: HdNode<any>
  private readonly apiClient: ApiClient

  /**
   * @param node the HdNode implementation to use for FullNodeDfiHdNode keeping this implementation agnostic.
   * @param apiClient connected local rpc based api client
   * @param options DeFi network specific wallet configurations
   */
  constructor (node: HdNode<any>, apiClient: ApiClient, options: DfiWalletOptions) {
    super(options);
    this.node = node;
    this.apiClient = apiClient;
  }

  async getBalance (): Promise<BigNumber> {
    const address = await this.getAddress('bech32')
    const result = await this.apiClient.call('listunspent', [0, 9999999, [address], true], 'bignumber')
    // TODO(fuxingloh): listunspent or a better way to implement this
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
    return new FullNodeDfiHdNode(node, this.apiClient, this.options)
  }

  async deriveHardened (index: number): Promise<FullNodeDfiHdNode> {
    const node = await this.node.deriveHardened(index)
    return new FullNodeDfiHdNode(node, this.apiClient, this.options)
  }

  async derivePath (path: string): Promise<FullNodeDfiHdNode> {
    const node = await this.node.derivePath(path)
    return new FullNodeDfiHdNode(node, this.apiClient, this.options)
  }

  sign (hash: Buffer, lowR?: boolean): Promise<Buffer> {
    return this.node.sign(hash, lowR)
  }

  verify (hash: Buffer, signature: Buffer): Promise<boolean> {
    return this.node.verify(hash, signature)
  }
}
