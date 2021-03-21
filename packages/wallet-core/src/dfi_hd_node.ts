import BigNumber from 'bignumber.js'
import { HdNode } from "./hd_node";

/**
 * Based on BIP32, DeFi implementation of Hierarchical Deterministic Node
 * Containing DeFi Blockchain specific features
 */
export interface DfiHdNode<T extends DfiHdNode<any>> extends HdNode<T> {

  /**
   * @return unspent transaction outputs balance
   */
  getUnspent (): Promise<BigNumber>

  /**
   * @param format address format
   * @return address formatted with as specified
   */
  getAddress (format: 'legacy' | 'p2sh' | 'bech32'): Promise<string>

  // TODO(fuxingloh): implementations of defi accounts feature
  // listaccounts
  // getaccount
  // gettokenbalances

  // utxostoaccount
  // accounttoutxos
  // accounttoaccount

  // listaccounthistory
  // accounthistorycount
  // sendtokenstoaddress

  // TODO(fuxingloh): ability create/send customTx? or separate this ability
}
