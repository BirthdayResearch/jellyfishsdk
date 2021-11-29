import { WalletAccount, WalletAccountProvider } from './wallet_account'
import { WalletHdNode, WalletHdNodeProvider } from './wallet_hd_node'

/**
 * Jellyfish managed wallet.
 * WalletHdNode instance is provided by WalletHdNodeProvider.
 * WalletAccount instance for interfacing layer/upstream to service will be provided by WalletAccountProvider.
 *
 * JellyfishWallet doesn't follow BIP-44.
 */
export class JellyfishWallet<Account extends WalletAccount, HdNode extends WalletHdNode> {
  static COIN_TYPE_BTC: number = 0
  static COIN_TYPE_DFI: number = 1129
  /**
   * Default purpose, for Light Wallet Implementation
   */
  static PURPOSE_LIGHT_WALLET: number = 0
  /**
   * For Masternode creation UTXO locking
   */
  static PURPOSE_LIGHT_MASTERNODE: number = 1
  /**
   * For light price oracle implementation
   */
  static PURPOSE_LIGHT_PRICE_ORACLE: number = 2

  /**
   * @param {WalletHdNodeProvider} nodeProvider
   * @param {WalletAccountProvider} accountProvider
   * @param {number} [coinType=1129] COIN_TYPE_DFI
   * @param {number} [purpose=0] PURPOSE_LIGHT_WALLET
   */
  constructor (
    private readonly nodeProvider: WalletHdNodeProvider<HdNode>,
    private readonly accountProvider: WalletAccountProvider<Account>,
    private readonly coinType: number = JellyfishWallet.COIN_TYPE_DFI,
    private readonly purpose: number = JellyfishWallet.PURPOSE_LIGHT_WALLET
  ) {
  }

  /**
   * @param {number} account number to get
   * @return Promise<WalletAccount>
   */
  get (account: number): Account {
    const path = `${this.coinType}/${this.purpose}/0/${account}`
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
