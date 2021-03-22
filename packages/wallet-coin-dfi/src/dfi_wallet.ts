import { HdWallet } from "@defichain/wallet-coin";
import { DfiHdNode } from "./dfi_node";

/**
 * Based on BIP44, DeFi implementation of Hierarchical Deterministic Wallet
 * Containing DeFi Blockchain specific features
 */
export interface DfiHdWallet<T extends DfiHdNode<T>> extends HdWallet<T> {

}
