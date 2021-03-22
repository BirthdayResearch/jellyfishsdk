import BigNumber from 'bignumber.js'
import { HdNode } from "@defichain/wallet-coin";

/**
 * Based on BIP32, DeFi implementation of Hierarchical Deterministic Node
 * Containing DeFi Blockchain specific features
 */
export interface DfiHdNode<T extends DfiHdNode<any>> extends HdNode<T> {

  /**
   * TODO(fuxingloh): rename this to getBalance?
   * @return unspent transaction outputs balance
   */
  getUnspent (): Promise<BigNumber>

  /**
   * @param format of the address, // TODO(fuxingloh): restricted to only 'bech32' as a default for now
   * @return address formatted with as specified
   */
  getAddress (format: 'bech32'): Promise<string>

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

  // TODO(fuxingloh): ability create/send customTx? or separate this ability into another module
}

// TODO(fuxingloh): address generation?
