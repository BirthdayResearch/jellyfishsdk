import BigNumber from 'bignumber.js'
import { HdNode } from "@defichain/wallet-coin";
import { toBech32 } from "./dfi_address";
import { DfiWalletOptions } from "./dfi_config";


/**
 * Based on BIP32, DeFi implementation of Hierarchical Deterministic Node
 * Containing DeFi Blockchain specific features
 */
export abstract class DfiHdNode<T extends DfiHdNode<any>> implements HdNode<T> {

  protected readonly options: DfiWalletOptions

  protected constructor (options: DfiWalletOptions) {
    this.options = options
  }

  /**
   * // TODO(fuxingloh): restricted to only 'bech32' as a default for now
   * @param format of the address
   * @return address formatted with as specified
   */
  async getAddress (format: 'bech32' = 'bech32'): Promise<string> {
    if (format === 'bech32') {
      const pubKey = await this.publicKey()
      return toBech32(pubKey, this.options.bech32.hrp)
    }

    throw new Error(`${format} not supported`);
  }

  abstract getBalance (): Promise<BigNumber>

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

  abstract publicKey (): Promise<Buffer>

  abstract privateKey (): Promise<Buffer>

  abstract derive (index: number): Promise<T>

  abstract deriveHardened (index: number): Promise<T>

  abstract derivePath (path: string): Promise<T>

  abstract sign (hash: Buffer, lowR?: boolean): Promise<Buffer>

  abstract verify (hash: Buffer, signature: Buffer): Promise<boolean>
}
