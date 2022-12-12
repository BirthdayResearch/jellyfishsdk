import { MasterNodeKey, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { DockerOptions } from 'dockerode'
import { DeFiDContainer, StartOptions } from '../DeFiDContainer'
import { RegTestContainer } from './index'
import { NativeChainWaitFor } from '@defichain/testcontainers/dist/containers/NativeChainWaitFor'

/**
 * RegTest with MasterNode preconfigured
 */
export class MasterNodeRegTestContainer extends RegTestContainer {
  waitFor = new NativeChainWaitFor(this)
  private readonly _masternodeKey: MasterNodeKey

  get masternodeKey (): MasterNodeKey {
    return this._masternodeKey
  }

  /**
   * @param {string} [masternodeKey=RegTestFoundationKeys[0]] pair to use for minting
   * @param {string} [image=DeFiDContainer.image] docker image name
   * @param {DockerOptions} [options]
   */
  constructor (masternodeKey: MasterNodeKey = RegTestFoundationKeys[0], image: string = DeFiDContainer.image, options?: DockerOptions) {
    super(image, options)
    this._masternodeKey = masternodeKey
  }

  /**
   * Additional debug options turned on for traceability.
   */
  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-dummypos=0',
      '-spv=1',
      '-anchorquorum=2',
      `-masternode_operator=${this.masternodeKey.operator.address}`
    ]
  }

  /**
   * @param {number} nblocks to generate
   * @param {string} address to generate to
   * @param {number} maxTries
   */
  async generate (nblocks: number, address: string = this.masternodeKey.operator.address, maxTries: number = 1000000): Promise<void> {
    return await this.rpc.generate(nblocks, address, maxTries)
  }

  /**
   * @param {number} nblocks to generate
   * @param {number} timeout
   * @param {string} address
   */
  async waitForGenerate (nblocks: number, timeout: number = 590000, address: string = this.masternodeKey.operator.address): Promise<void> {
    return await this.waitFor.generate(nblocks, timeout, address)
  }

  /**
   * This will automatically import the necessary private key for master to mint tokens
   */
  async start (startOptions: StartOptions = {}): Promise<void> {
    await super.start(startOptions)

    await this.rpc.call('importprivkey', [this.masternodeKey.operator.privKey, 'operator', true])
    await this.rpc.call('importprivkey', [this.masternodeKey.owner.privKey, 'owner', true])
  }

  /**
   * Wait for block height by minting towards the target
   *
   * @param {number} height to wait for
   * @param {number} [timeout=590000] in ms
   */
  async waitForBlockHeight (height: number, timeout = 590000): Promise<void> {
    return await this.waitFor.blockHeight(height, timeout)
  }

  /**
   * Wait for master node wallet coin to be mature for spending.
   *
   * A coinbase transaction must be 100 blocks deep before you can spend its outputs. This is a
   * safeguard to prevent outputs that originate from the coinbase transaction from becoming
   * un-spendable (in the event the mined block moves out of the active chain due to a fork).
   *
   * @param {number} [timeout=180000] in ms
   * @param {boolean} [mockTime=true] to generate blocks faster
   */
  async waitForWalletCoinbaseMaturity (timeout: number = 180000, mockTime: boolean = true): Promise<void> {
    return await this.waitFor.walletCoinbaseMaturity(timeout, mockTime)
  }

  /**
   * Wait for in wallet balance to be greater than an amount.
   * This allow test that require fund to wait for fund to be filled up before running the tests.
   * This method will trigger block generate to get to the required balance faster.
   * Set `timeout` to higher accordingly when large balance required.
   *
   * @param {number} balance to wait for in wallet to be greater than or equal
   * @param {number} [timeout=300000] in ms
   * @see waitForWalletCoinbaseMaturity
   */
  async waitForWalletBalanceGTE (balance: number, timeout = 300000): Promise<void> {
    return await this.waitFor.walletBalanceGTE(balance, timeout)
  }

  /**
   * Wait for anchor teams
   *
   * @param {number} nodesLength
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */

  /* istanbul ignore next, TODO(canonbrother) */
  async waitForAnchorTeams (nodesLength: number, timeout = 30000): Promise<void> {
    return await this.waitFor.anchorTeams(nodesLength, timeout)
  }

  /**
   * Wait for anchor auths
   *
   * @param {number} nodesLength
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */

  /* istanbul ignore next, TODO(canonbrother) */
  async waitForAnchorAuths (nodesLength: number, timeout = 30000): Promise<void> {
    return await this.waitFor.anchorAuths(nodesLength, timeout)
  }

  /**
   * Wait for anchor reward confirms
   *
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async waitForAnchorRewardConfirms (timeout = 30000): Promise<void> {
    return await this.waitFor.anchorRewardConfirms(timeout)
  }

  /**
   * Wait for price become valid
   *
   * @param {string} fixedIntervalPriceId
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async waitForPriceValid (fixedIntervalPriceId: string, timeout = 30000): Promise<void> {
    return await this.waitFor.priceValid(fixedIntervalPriceId, timeout)
  }

  /**
   * Wait for price become invalid
   *
   * @param {string} fixedIntervalPriceId
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async waitForPriceInvalid (fixedIntervalPriceId: string, timeout = 30000): Promise<void> {
    return await this.waitFor.priceInvalid(fixedIntervalPriceId, timeout)
  }

  /**
   * Wait for valut state
   *
   * @param {string} vaultId
   * @param {string} state
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async waitForVaultState (vaultId: string, state: string, timeout = 30000): Promise<void> {
    return await this.waitFor.vaultState(vaultId, state, timeout)
  }

  /**
   * Get next price block before the given target block
   *
   * @param {string} fixedIntervalPriceId
   * @param {number} [targetBlock]
   * @return {Promise<number>}
   */
  async getImmediatePriceBlockBeforeBlock (fixedIntervalPriceId: string, targetBlock: number): Promise<number> {
    return await this.rpc.getImmediatePriceBlockBeforeBlock(fixedIntervalPriceId, targetBlock)
  }

  /**
   * Wait for active price
   *
   * @param {string} fixedIntervalPriceId
   * @param {string} activePrice
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async waitForActivePrice (fixedIntervalPriceId: string, activePrice: string, timeout = 30000): Promise<void> {
    return await this.waitFor.activePrice(fixedIntervalPriceId, activePrice, timeout)
  }

  /**
   * Wait for next price
   *
   * @param {string} fixedIntervalPriceId
   * @param {string} nextPrice
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async waitForNextPrice (fixedIntervalPriceId: string, nextPrice: string, timeout = 30000): Promise<void> {
    return await this.waitFor.nextPrice(fixedIntervalPriceId, nextPrice, timeout)
  }

  /**
   * Fund an address with an amount and wait for 1 confirmation.
   * Funded address don't have to be tracked within the node wallet.
   * This allows for light wallet implementation testing.
   *
   * @param {string} address to fund
   * @param {number} amount to fund an address, take note of number precision issues, BigNumber not included in pkg.
   * @return {Promise<{txid: string, vout: number}>} txid and index of the transaction
   * @see waitForWalletCoinbaseMaturity
   * @see waitForWalletBalanceGTE
   */
  async fundAddress (address: string, amount: number): Promise<{ txid: string, vout: number }> {
    return await this.rpc.fundAddress(address, amount)
  }

  /**
   * Create a new bech32 address and get the associated priv key for it.
   * The address is created in the wallet and the priv key is dumped out.
   * This is to facilitate raw tx feature testing, if you need an address that is not associated with the wallet,
   * use jellyfish-crypto instead.
   *
   * This is not a deterministic feature, each time you run this, you get a different set of address and keys.
   *
   * @return {Promise<{ address: string, privKey: string, pubKey: string }>} a new address and it's associated privKey
   */
  async newAddressKeys (): Promise<{ address: string, privKey: string, pubKey: string }> {
    return await this.rpc.newAddressKeys()
  }
}
