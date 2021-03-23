import BigNumber from 'bignumber.js'
import { HdWallet } from "@defichain/wallet-coin";
import { DfiHdNode } from "./dfi_node";

const COIN_TYPE_DFI = 1129

/**
 * Based on BIP44, DeFi implementation of Hierarchical Deterministic Wallet
 * Containing DeFi Blockchain specific features
 */
export abstract class DfiHdWallet<T extends DfiHdNode<T>> extends HdWallet<T> {

  /**
   * @param master node of the HDW
   */
  protected constructor (master: T) {
    super(master, COIN_TYPE_DFI)
  }

  abstract getBalance (): Promise<BigNumber>
}
