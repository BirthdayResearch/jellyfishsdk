import { WalletAccount, WalletAccountProvider } from './wallet_account'
import { WalletHdNode, WalletHdNodeProvider } from './wallet_hd_node'

/**
 * Jellyfish managed wallet.
 * WalletHdNode instance is provided by WalletHdNodeProvider.
 * WalletAccount instance for interfacing layer/upstream to service will be provided by WalletAccountProvider.
 */
export class JellyfishWallet<Account extends WalletAccount, HdNode extends WalletHdNode> {
  private readonly nodeProvider: WalletHdNodeProvider<HdNode>
  private readonly accountProvider: WalletAccountProvider<Account>

  /**
   * @param {WalletHdNodeProvider} nodeProvider
   * @param {WalletAccountProvider} accountProvider
   */
  constructor (nodeProvider: WalletHdNodeProvider<HdNode>, accountProvider: WalletAccountProvider<Account>) {
    this.nodeProvider = nodeProvider
    this.accountProvider = accountProvider
  }

  /**
   * @param {number} account number to get
   * @return Promise<WalletAccount>
   */
  get (account: number): Account {
    const path = `${account}/0/0`
    const node = this.nodeProvider.derive(path)
    return this.accountProvider.provide(node)
  }

  /**
   * Check if account in the wallet is usable.
   * An usable account in wallet is a account that has no activity gap.
   * Account 0 (default) is always valid.
   *
   * @example 0 is the default account and usable regardless
   * @example 0,1 is usable when [0] has activity
   * @example 0,1,2 is usable when [0,1] has activity
   * @example 0,1,2,3 is usable when [0,1,2] has activity
   * @example 0,1 is usable when [0,1,3] has activity (3 should never ever has transaction in the first place)
   *
   * @param {number} account number to check if valid
   * @return Promise<boolean> usability of account
   */
  async isUsable (account: number): Promise<boolean> {
    if (account === 0) {
      return true
    }

    return await this.get(account - 1).isActive()
  }

  /**
   * Discover accounts that are active in managed JellyfishWallet.
   * Account are considered active if the address contains any transaction activity.
   * Default account, the first account will always get discovered regardless.
   *
   * @param {number} maxAccounts to discover
   * @return WalletAccount[] discovered
   */
  async discover (maxAccounts: number = 100): Promise<Account[]> {
    const wallets: Account[] = []

    for (let i = 0; i < maxAccounts; i++) {
      const account = await this.get(i)
      if (!await account.isActive()) {
        break
      }

      wallets[i] = account
    }

    return wallets
  }
}
