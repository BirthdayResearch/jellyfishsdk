import { WalletAccount, WalletAccountProvider } from './wallet_account'
import { WalletHdNode, WalletHdNodeProvider } from './wallet_hd_node'

/**
 * DFI CoinType
 */
const COIN_TYPE: number = 1129

/**
 * Jellyfish managed wallet.
 * WalletHdNode instance is provided by WalletHdNodeProvider.
 * WalletAccount instance for interfacing layer/upstream to service will be provided by WalletAccountProvider.
 */
export class JellyfishWallet<Account extends WalletAccount, HdNode extends WalletHdNode> {
  private readonly accountProvider: WalletAccountProvider<Account>
  private readonly nodeProvider: WalletHdNodeProvider<HdNode>

  /**
   * @param {WalletAccountProvider} accountProvider
   * @param {WalletHdNodeProvider} nodeProvider
   */
  constructor (accountProvider: WalletAccountProvider<Account>, nodeProvider: WalletHdNodeProvider<HdNode>) {
    this.accountProvider = accountProvider
    this.nodeProvider = nodeProvider
  }

  /**
   * @param {number} account number to get
   * @return {Promise<WalletAccount>}
   */
  get (account: number): Account {
    const path = `44'/${COIN_TYPE}'/${account}'/0/0`
    const node = this.nodeProvider.derive(path)
    return this.accountProvider.provide(node)
  }

  /**
   * Discover accounts that are active in managed JellyfishWallet.
   * Account are considered active if the address contains any transaction activity.
   * Default account, the first account will always get discovered regardless.
   *
   * @param {number} maxAccounts to discover
   * @return {WalletAccount[]} discovered
   */
  async discover (maxAccounts: number = 10000): Promise<Account[]> {
    const wallets: Account[] = [
      await this.get(0)
    ]

    for (let i = 1; i < maxAccounts; i++) {
      const account = await this.get(i)
      if (!await account.isActive()) {
        break
      }

      wallets[i] = account
    }

    return wallets
  }
}
