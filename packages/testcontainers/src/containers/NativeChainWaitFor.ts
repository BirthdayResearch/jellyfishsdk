import { waitForCondition } from '../utils'
import { StartedNativeChainContainer } from './NativeChainContainer'
import { MasterNodeRegTestContainer } from '../index'

export class NativeChainWaitFor {
  constructor (private readonly sncc: StartedNativeChainContainer | MasterNodeRegTestContainer) {}

  /**
   * @param {number} nblocks to generate
   * @param {number} timeout
   * @param {string} address
   */
  async generate (nblocks: number, timeout: number = 590000, address: string | undefined): Promise<void> {
    const target = await this.sncc.rpc.getBlockCount() + nblocks

    return await waitForCondition(async () => {
      const count = await this.sncc.rpc.getBlockCount()
      if (count > target) {
        return true
      }
      await this.sncc.rpc.generate(1, address)
      return false
    }, timeout, 100, 'waitForGenerate')
  }

  /**
   * Wait for block height by minting towards the target
   *
   * @param {number} height to wait for
   * @param {number} [timeout=590000] in ms
   */
  async blockHeight (height: number, timeout: number = 590000): Promise<void> {
    return await waitForCondition(async () => {
      const count = await this.sncc.rpc.getBlockCount()
      if (count > height) {
        return true
      }
      await this.sncc.rpc.generate(1)
      return false
    }, timeout, 100, 'waitForBlockHeight')
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
  async walletCoinbaseMaturity (timeout: number = 180000, mockTime: boolean = true): Promise<void> {
    if (!mockTime) {
      return await this.blockHeight(100, timeout)
    }

    let fakeTime: number = 1579045065
    await this.sncc.rpc.call('setmocktime', [fakeTime])

    const intervalId = setInterval(() => {
      fakeTime += 3
      void this.sncc.rpc.call('setmocktime', [fakeTime])
    }, 200)

    await this.blockHeight(100, timeout)

    clearInterval(intervalId)
    await this.sncc.rpc.call('setmocktime', [0])
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
  async walletBalanceGTE (balance: number, timeout: number = 300000): Promise<void> {
    return await waitForCondition(async () => {
      const getbalance = await this.sncc.rpc.call('getbalance')
      if (getbalance >= balance) {
        return true
      }
      await this.sncc.rpc.generate(1)
      return false
    }, timeout, 100, 'waitForWalletBalanceGTE')
  }

  /**
   * Wait for anchor teams
   *
   * @param {number} nodesLength
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */

  /* istanbul ignore next, TODO(canonbrother) */
  async anchorTeams (nodesLength: number, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const anchorTeams = await this.sncc.rpc.call('getanchorteams')
      return anchorTeams.auth.length === nodesLength && anchorTeams.confirm.length === nodesLength
    }, timeout, 100, 'waitForAnchorTeams')
  }

  /**
   * Wait for anchor auths
   *
   * @param {number} nodesLength
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */

  /* istanbul ignore next, TODO(canonbrother) */
  async anchorAuths (nodesLength: number, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const auths = await this.sncc.rpc.call('spv_listanchorauths')
      return auths.length > 0 && auths[0].signers === nodesLength
    }, timeout, 100, 'waitForAnchorAuths')
  }

  /**
   * Wait for anchor reward confirms
   *
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async anchorRewardConfirms (timeout: number = 30000): Promise<void> {
    // extra info here
    // max signers in regtest is 3, others are 5
    // majority is defined as 66% above
    const majority = 2
    return await waitForCondition(async () => {
      const confirms = await this.sncc.rpc.call('spv_listanchorrewardconfirms')
      return confirms.length === 1 && confirms[0].signers >= majority
    }, timeout, 100, 'waitForAnchorRewardConfrims')
  }

  /**
   * Wait for price become valid
   *
   * @param {string} fixedIntervalPriceId
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async priceValid (fixedIntervalPriceId: string, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const data: any = await this.sncc.rpc.call('getfixedintervalprice', [fixedIntervalPriceId])
      // eslint-disable-next-line
      if (!data.isLive) {
        await this.sncc.rpc.generate(1)
        return false
      }
      return true
    }, timeout, 100, 'waitForPriceValid')
  }

  /**
   * Wait for price become invalid
   *
   * @param {string} fixedIntervalPriceId
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async priceInvalid (fixedIntervalPriceId: string, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const data: any = await this.sncc.rpc.call('getfixedintervalprice', [fixedIntervalPriceId])
      // eslint-disable-next-line
      if (data.isLive) {
        await this.sncc.rpc.generate(1)
        return false
      }
      return true
    }, timeout, 100, 'waitForPriceInvalid')
  }

  /**
   * Wait for valut state
   *
   * @param {string} vaultId
   * @param {string} state
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async vaultState (vaultId: string, state: string, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const vault = await this.sncc.rpc.call('getvault', [vaultId])
      if (vault.state !== state) {
        await this.sncc.rpc.generate(1)
        return false
      }
      return true
    }, timeout, 100, 'waitForVaultState')
  }

  /**
   * Wait for active price
   *
   * @param {string} fixedIntervalPriceId
   * @param {string} activePrice
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async activePrice (fixedIntervalPriceId: string, activePrice: string, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const data: any = await this.sncc.rpc.call('getfixedintervalprice', [fixedIntervalPriceId])
      // eslint-disable-next-line
      if (data.activePrice.toString() !== activePrice) {
        await this.sncc.rpc.generate(1)
        return false
      }
      return true
    }, timeout, 100, 'waitForActivePrice')
  }

  /**
   * Wait for next price
   *
   * @param {string} fixedIntervalPriceId
   * @param {string} nextPrice
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async nextPrice (fixedIntervalPriceId: string, nextPrice: string, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const data: any = await this.sncc.rpc.call('getfixedintervalprice', [fixedIntervalPriceId])
      // eslint-disable-next-line
      if (data.nextPrice.toString() !== nextPrice) {
        await this.sncc.rpc.generate(1)
        return false
      }
      return true
    }, timeout, 100, 'waitForNextPrice')
  }
}
