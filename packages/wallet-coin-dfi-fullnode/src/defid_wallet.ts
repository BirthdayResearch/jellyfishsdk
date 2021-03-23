import BigNumber from 'bignumber.js';
import { AbortSignal, ProcessCallback } from "@defichain/wallet-coin";
import { DfiHdWallet } from "@defichain/wallet-coin-dfi";
import { FullNodeDfiHdNode } from "./defid_node";
import { ApiClient } from "@defichain/api-core";

/**
 * DeFi Blockchain HdWallet implementation connecting to a local DeFi Daemon, 'defid'
 *
 * DeFiDHdWallet implements a look ahead account discovery for wallet, it import address and wait for rescan to complete.
 */
export class FullNodeDfiHdWallet<T extends FullNodeDfiHdNode> extends DfiHdWallet<FullNodeDfiHdNode> {

  protected apiClient: ApiClient;

  constructor (apiClient: ApiClient, master: FullNodeDfiHdNode) {
    super(master);
    this.apiClient = apiClient;
  }

  getBalance (): Promise<BigNumber> {
    return this.apiClient.wallet.getBalance()
  }

  async isNodeActive (node: FullNodeDfiHdNode): Promise<boolean> {
    const address = await node.getAddress('bech32')

    const history: any[] = await this.apiClient.call('listaccounthistory', [address, { limit: 1 }], 'bignumber')
    if (history.length > 0) {
      return true
    }

    const received: BigNumber = await this.apiClient.call('getreceivedbyaddress', [address], 'bignumber')
    if (received.isGreaterThan(new BigNumber("0"))) {
      return true
    }

    return false
  }

  protected async importPubKey (buffer: Buffer): Promise<void> {
    const hex = buffer.toString('hex')
    await this.apiClient.call('importpubkey', [hex, '', false], 'lossless')
  }

  protected async rescan (): Promise<void> {
    // TODO(fuxingloh): this implementation require a good way to tackle rescan
    //  - a long pooling event such as this is destined to fail
    //  - will batching the discovery process help?
    //  - need to look into wallet-coin discovery logic and ease of interpolation with non full node implementation

    // await this.apiClient.call('rescanblockchain', [], 'lossless')
  }

  /**
   * Full node rescan can take many hours, this look ahead account discovery implements attempt to speed up the process
   * by batching account discovery.
   */
  protected async lookAheadRescan (account: number, batchSize: number) {
    for (let i = 0; i < batchSize; i++) {
      const { node } = await this.getAddress(account, 0, i)
      await this.importPubKey(await node.publicKey())
    }
    await this.rescan()
  }

  protected async discoverAddress (account: number, gapLimit: number, abortSignal?: AbortSignal, progress?: ProcessCallback): Promise<number> {
    await this.lookAheadRescan(account, gapLimit * 2)
    return super.discoverAddress(account, gapLimit, abortSignal, progress)
  }
}
