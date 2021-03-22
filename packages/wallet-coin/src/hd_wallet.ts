import { HdNode } from './hd_node'

/**
 * BIP44 Hierarchical Deterministic Wallet Implementation
 * Following Purpose/CoinType/Account/Chain/Address
 * https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 *
 * HdWallet implements Account/Chain/Address with auto discovery mechanism.
 * - Purpose is fixed to 44, address format implementation is up to the node to implement.
 * - CoinType is initialized in the constructor, CoinType-agnostic.
 * - Account will be auto discovered.
 * - Chain is fixed to 0, change address implementation is ignored. (At least for now)
 * - Address will be auto discovered respecting gap limit of 20.
 *
 * For "m/44'/1129'/0'/0/0" only "0'/0/0" is managed by HdWallet.
 *
 * HdWallet implementations is stateless, only the hd seed is required.  Only activated/discovered address are kept, the
 * discover implementation is provided to find activated address. You can generate new address and it will be discovered
 * on backup if you respect the gap limit set.
 *
 * As HdWallet implements the wallet address discovery logic for each coin type, you should let HdWallet determine when
 * new account or address can be created. This will keep the discovery logic in sync when restored or shared between
 * systems.
 */
export abstract class HdWallet<T extends HdNode<T>> {

  /**
   * The master node. In another words, if the node fingerprint is 0x00000000
   */
  private readonly master: T;
  private readonly purpose: number = 44;
  private readonly coinType: number;

  /**
   * Currently discovered and cached hierarchical nodes.
   * Address derived within the cached hierarchical must not be undefined.
   */
  private readonly accounts: {
    length: number,
    [account: number]: {
      length: number,
      [chain: number]: {
        length: number,
        [address: number]: HdWalletAddress<T>
      }
    }
  }

  /**
   * @param master node of the HDW
   * @param coinType of this HdWallet
   */
  protected constructor (master: T, coinType: number) {
    this.master = master;
    this.coinType = coinType
    this.accounts = []
  }

  /**
   * @return length of all accounts discovered
   */
  getAccountLength (): number {
    return this.accounts.length
  }

  /**
   * @param account of the address
   * @param chain of the address
   * @return length of all address discovered within account and chain
   */
  getAddressLength (account: number, chain: number = 0): number {
    return this.accounts[account][0].length
  }

  /**
   * Following the specification of BIP44
   * You can get discovered account address or derive new account address within the limitations.
   * This method can be very slow as it follows strict deterministic wallet behavior it has many guarantees and follows
   * the limitations strictly. Attempting to derive an address will fill all empty addresses within its path.
   * @see isNodeActive ALL NEW ACCOUNT AND ADDRESS CREATION WILL DEPENDS ON THE PERFORMANCE OF THE isNodeActive METHOD.
   *
   * @throws HdWalletAccountLimit as it disallow creation of new accounts if previous account
   * has no transaction activity within the gap limit.
   *
   * @throws HdWalletAddressLimit will warn when the user is trying to exceed the gap limit
   * on an external chain by generating a new address. (gap limit = 20 by default)
   *
   * Purpose is a constant set to 44' (or 0x8000002C) following the BIP43 recommendation.
   * It indicates that the subtree of this node is used according to this specification.
   * Hardened derivation is used at this level.
   *
   * CoinType is provided in constructor, it creates a separate subtree for every cryptocoin,
   * avoiding reusing addresses across cryptocoins and improving privacy issues.
   * Hardened derivation is used at this level.

   * @param account level splits the key space into independent user identities,
   * so the wallet never mixes the coins across different accounts.
   * Hardened derivation is used at this level.
   *
   * @param chain internal chain, external chain, also known as the change address.
   * Public derivation is used at this level.
   *
   * @param address are numbered from index 0 in sequentially increasing manner.
   * This number is used as child index in BIP32 derivation.
   * Public derivation is used at this level.
   *
   * @param gapLimit address gap limit should be defaulted to 20.
   * If the software hits 20 unused addresses in a row,
   * it expects there are no used addresses beyond this point and stops searching the address chain.
   * We scan just the external chains, because internal chains receive only coins that come from the
   * associated external chains.
   *
   * @param abortSignal to abort account/address discovery
   * @param progress to receive periodical update of the account/address discovery
   */
  async derive (account: number, chain: number, address: number, gapLimit: number = 20, abortSignal?: AbortSignal, progress?: ProcessCallback): Promise<T> {
    /**
     * @throws HdWalletAccountLimit as it disallow creation of new accounts if previous account
     * has no transaction activity within the gap limit.
     */
    const initAccount = async (account: number): Promise<void> => {
      if (this.accounts?.[account]) {
        return
      }

      // Index = 0 account can always be created.
      if (account === 0) {
        this.accounts[0] = []
        return
      }

      // Previous account does not exist, therefore no activity
      if (!this.accounts[account - 1]) {
        throw new HdWalletAccountLimit();
      }

      // Previous account exist, check if any address within the account has activity
      const hasActivity = await this.hasAccountActivity(account - 1, gapLimit, abortSignal)
      if (!hasActivity) {
        // Previous account has no activity
        throw new HdWalletAccountLimit();
      }

      this.accounts[account] = []
    }

    const initChain = async (account: number, chain: number): Promise<void> => {
      if (this.accounts[account]?.[chain]) {
        return
      }
      this.accounts[account][chain] = []
    }

    /**
     * @throws HdWalletAddressLimit will warn when the user is trying to exceed the gap limit
     * on an external chain by generating a new address. (gap limit = 20 by default)
     *
     * Attempting to derive an address will fill all empty addresses within its path.
     */
    const initAddress = async (account: number, chain: number, address: number): Promise<void> => {
      if (this.accounts[account][chain]?.[address]) {
        return
      }

      let withinGapLimit = address < (gapLimit + this.accounts[account][chain].length)
      if (!withinGapLimit) {
        // If not within the gapLimit, attempt to discover all addresses within account
        await this.discoverAddress(account, gapLimit, abortSignal, progress)
      }

      // Post-discovery
      withinGapLimit = address < (gapLimit + this.accounts[account][chain].length)
      if (!withinGapLimit) {
        // After discovery, attempt to derive address an address that exceed gap limit will fail
        throw new HdWalletAddressLimit();
      }

      // Fill all empty addresses within its path.
      for (let i = this.accounts[account][chain].length; i <= address; i++) {
        if (!this.accounts[account][chain][i]) {
          this.accounts[account][chain][i] = {
            node: await this.master.derivePath(`m/${this.purpose}'/${this.coinType}'/${account}'/${chain}/${i}`),
            active: false
          }
        }
      }
    }

    await initAccount(account)
    await initChain(account, chain)
    await initAddress(account, chain, address)
    return this.accounts[account][chain][address].node
  }

  /**
   * Used as part of hierarchical discovery of addresses.
   * As this is a potentially very expensive operation, caching the result will greatly help the address discovery
   * process.
   *
   * ALL NEW ACCOUNT AND ADDRESS CREATION WILL DEPENDS ON THE PERFORMANCE OF THIS METHOD.
   *
   * @param node to check if it is active
   * @return whether this node is active
   * e.g. historical transactions done on this address
   */
  abstract isNodeActive (node: T): Promise<boolean>

  /**
   * Account discovery as described in bip-0044
   * 1. derive the first account's node (index = 0)
   * 2. derive the external chain node of this account
   * 3. scan addresses of the external chain; respect the gap limit described below
   * 4. if no transactions are found on the external chain, stop discovery
   * 5. if there are some transactions, increase the account index and go to step 1
   *
   * This progress can take hours depending on the implementation of address transaction activity discovery.
   * As some discovery requires reindex of the entire blockchain when new address get discovered.
   *
   * @param gapLimit address gap limit should be defaulted to 20.
   * If the software hits 20 unused addresses in a row,
   * it expects there are no used addresses beyond this point and stops searching the address chain.
   * We scan just the external chains, because internal chains receive only coins that come from the
   * associated external chains.
   *
   * @param abortSignal to abort account/address discovery
   * @param progress to receive periodical update of the account/address discovery
   *
   * TODO(fuxingloh): worth while to reimplement this in reactive streams;
   *  rxjs for example.
   *  Currently this implementation has very high evolution tech debt.
   */
  async discover (gapLimit: number = 20, abortSignal?: AbortSignal, progress?: ProcessCallback): Promise<void> {

    /**
     * Discover account with an accountIndex
     */
    const discoverAccount = async (accountIndex: number): Promise<void> => {
      if (progress) {
        progress(DiscoverActivity.account_discovering, accountIndex)
      }

      if (!this.accounts[accountIndex]) {
        // 1.1 derive account node, create if missing
        this.accounts[accountIndex] = []
        // 2. derive the external chain node of this account
        this.accounts[accountIndex][0] = []
      }

      // 3. scan addresses of the external chain
      const hasActivityCount = await this.discoverAddress(accountIndex, gapLimit, abortSignal, progress)
      // 4. if no transactions are found on the external chain, stop discovery
      if (hasActivityCount > 0) {
        // 5. if there are some transactions, increase the account index and go to step 1
        await discoverAccount(accountIndex + 1)
      }
    }

    // 1. derive the first account's node (index = 0)
    await discoverAccount(0)
  }

  // TODO(fuxingloh): restore (account: number, chain: number, address: number)
  //  to allow discovery to be ignored as it is potentially a slow process, 1 hour++++
  //  restore will automatically 'discover' accounts and address up to the provided specification.

  /**
   * No restriction, get address method to get a new HdWalletAddress or get the existing one if it exist.
   * For new node it will be derived from master.
   */
  protected async getAddress (account: number, chain: number, address: number): Promise<HdWalletAddress<T>> {
    const node = this.accounts[account][chain][address]
    if (node) {
      return node
    }
    return {
      node: await this.master.derivePath(`m/${this.purpose}'/${this.coinType}'/${account}'/${chain}/${address}`),
      active: false,
    }
  }

  /**
   * @param account level splits the key space into independent user identities.
   *
   * @param gapLimit address gap limit should be defaulted to 20.
   * If the software hits 20 unused addresses in a row,
   * it expects there are no used addresses beyond this point and stops searching the address chain.
   * We scan just the external chains, because internal chains receive only coins that come from the
   * associated external chains.
   *
   * @param abortSignal to abort account/address discovery
   */
  protected async hasAccountActivity (account: number, gapLimit: number, abortSignal?: AbortSignal): Promise<boolean> {
    for (let i = 0, gap = 0; gap < gapLimit; gap++, i++) {
      if (abortSignal?.aborted) {
        // aborted if signed to abort
        throw new Error('aborted');
      }
      const address = await this.getAddress(account, 0, i)

      if (address.active) {
        return true
      }

      if (await this.isNodeActive(address.node)) {
        address.active = true
        return true
      }
    }

    return false
  }

  /**
   * Discover all addresses within account, respecting the gap limit
   *
   * @param account to discover as it splits the key space into independent user identities.
   *
   * @param gapLimit address gap limit should be defaulted to 20.
   * If the software hits 20 unused addresses in a row,
   * it expects there are no used addresses beyond this point and stops searching the address chain.
   * We scan just the external chains, because internal chains receive only coins that come from the
   * associated external chains.
   * @param abortSignal to abort account/address discovery
   *
   * @param progress to receive periodical update of the account/address discovery
   *
   * @return number of address in chain that has any transaction activity
   */
  protected async discoverAddress (account: number, gapLimit: number, abortSignal?: AbortSignal, progress?: ProcessCallback): Promise<number> {
    const addresses: HdWalletAddress<T>[] = []
    let hasActivity = 0
    // 3.1 respect the gap limit provided above
    for (let i = 0, gap = 0; gap < gapLimit; i++, gap++) {
      // aborted if signed to abort
      if (abortSignal?.aborted) {
        throw new Error('aborted');
      }
      addresses[i] = await this.getAddress(account, 0, i)
      if (progress) {
        progress(DiscoverActivity.address_discovering, account, 0, i)
      }
      if (addresses[i].active || await this.isNodeActive(addresses[i].node)) {
        if (progress) {
          progress(DiscoverActivity.address_active, account, 0, i)
        }
        // 3.2 reset gap to 0
        gap = 0
        hasActivity++
        addresses[i].active = true
        // 3.3 replace addresses into HdWallet cache
        this.accounts[account][0] = addresses
      }
    }
    // 3.3 return the number of address in chain that has any transaction activity
    return hasActivity
  }
}

interface HdWalletAddress<T> {
  node: T

  /**
   * Cached response of whether an address is cached.
   */
  active: boolean
}

/**
 * Discover activity type
 */
export enum DiscoverActivity {
  account_discovering = 'account_discovering',
  address_discovering = 'address_discovering',
  address_active = 'address_active',
}

/**
 * Progress of HdWallet discovery with
 * - discovery activity type: DiscoverActivity
 * - account index: number
 * - chain index: number
 * - address index: number
 */
export interface ProcessCallback {
  (activity: DiscoverActivity, account: number, chain?: number, address?: number): void
}

/**
 * Interface of AbortSignal, doesn't require any implementation.
 * Only require the ability to read an abort signal.
 * https://dom.spec.whatwg.org/#interface-abortcontroller
 * https://github.com/mysticatea/abort-controller
 */
export interface AbortSignal {
  aborted: boolean
}

/**
 * BIP44 Hierarchical Deterministic Wallet Implementation
 * Following Purpose/CoinType/Account/Chain/Address
 * https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 *
 * HdWallet will disallow creation of new accounts if previous account
 * has no transaction activity within the gap limit.
 */
export class HdWalletAccountLimit extends Error {
  constructor () {
    super("Unable to create new accounts if previous account has no transaction activity.");
  }
}

/**
 * BIP44 Hierarchical Deterministic Wallet Implementation
 * Following Purpose/CoinType/Account/Chain/Address
 * https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 *
 * HdWallet will warn when the user is trying to exceed the gap limit
 * on an external chain by generating a new address.
 */
export class HdWalletAddressLimit extends Error {
  constructor () {
    super("Unable to create new address as it exceeded the transaction activity gap limit.");
  }
}
