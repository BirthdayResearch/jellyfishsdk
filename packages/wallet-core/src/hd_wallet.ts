import { HDNode } from "./hd_node";

export const DEFAULT_WALLET_PATH = "m/44'/1129'/0'/0/0";

export interface HDWalletNode extends HDNode {

  nodes: HDWalletNode[]

  /**
   * https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
   *
   * Account discovery as described in bip-0044
   * 1. derive the first account's node (index = 0)
   * 2. derive the external chain node of this account
   * 3. scan addresses of the external chain; respect the gap limit described below
   * 4. if no transactions are found on the external chain, stop discovery
   * 5. if there are some transactions, increase the account index and go to step 1
   *
   * @param gapLimit address gap limit should be defaulted to 20.
   * If the software hits 20 unused addresses in a row,
   * it expects there are no used addresses beyond this point and stops searching the address chain.
   * We scan just the external chains, because internal chains receive only coins that come from the
   * associated external chains.
   */
  discover (gapLimit: number): void;

  /**
   * Get balance of the current wallet node
   */
  getBalance (): number;

  // TODO(fuxingloh): getAccount interface
}
