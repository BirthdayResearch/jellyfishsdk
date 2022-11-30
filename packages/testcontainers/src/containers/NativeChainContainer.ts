import {
  GenericContainer,
  StartedTestContainer
} from 'testcontainers'
import fetch from 'cross-fetch'
import { AbstractStartedContainer } from 'testcontainers/dist/modules/abstract-started-container'
import { getNetwork, MasterNodeKey, Network as BlockchainNetwork, NetworkName, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { waitForCondition } from '..'
import { RestartOptions } from 'testcontainers/dist/test-container'

/**
 * DeFiChain NativeChain node managed in docker
 */
export class NativeChainContainer extends GenericContainer {
  /**
   * @param {string} image docker image name
   */
  constructor (
    image: string = NativeChainContainer.image
  ) {
    super(image)
  }

  static get image (): string {
    if (process?.env?.DEFICHAIN_DOCKER_IMAGE !== undefined) {
      return process.env.DEFICHAIN_DOCKER_IMAGE
    }
    return 'defi/defichain:HEAD-02ef6a1b3'
  }

  public static readonly PREFIX = 'defichain-testcontainers-'

  /**
   * Generate a name for a new docker container with network type and random number
   */
  generateName (): string {
    const rand = Math.floor(Math.random() * 10000000)
    return `${NativeChainContainer.PREFIX}-${this.blockchainNetwork.name}-${rand}`
  }

  protected blockchainNetwork: BlockchainNetwork = getNetwork('testnet')

  /**
   * @param networkName Blockchain network name (e.g. 'testnet')
   * @returns this
   */
  public withBlockchainNetwork (networkName: NetworkName): this {
    this.blockchainNetwork = getNetwork(networkName)
    return this
  }

  public static readonly DefaultRpcUser = 'testcontainers-user'
  public static readonly DefaultRpcPassword = 'testcontainers-password'

  protected rpcUser: string = NativeChainContainer.DefaultRpcUser
  protected rpcPassword: string = NativeChainContainer.DefaultRpcPassword

  public withRpcUser (rpcUser: string): this {
    this.rpcUser = rpcUser
    return this
  }

  public withRpcPassword (rpcPassword: string): this {
    this.rpcPassword = rpcPassword
    return this
  }

  protected masterNodeKey?: MasterNodeKey

  public withMasterNodeKey (key: MasterNodeKey): this {
    this.masterNodeKey = key
    return this
  }

  protected hasPreconfiguredMasternode: boolean = false

  public withPreconfiguredRegtestMasternode (masterNodeKey = RegTestFoundationKeys[0]): this {
    this.withMasterNodeKey(masterNodeKey)
    this.withBlockchainNetwork('regtest')
    this.hasPreconfiguredMasternode = true
    return this
  }

  public static readonly defaultCmd = {
    prepend: [
      'defid',
      '-printtoconsole',
      '-rpcallowip=0.0.0.0/0',
      '-rpcbind=0.0.0.0',
      '-rpcworkqueue=512'
    ],
    testnet: [
      '-testnet=1'
    ],
    regtest: [
      '-regtest=1',
      '-jellyfish_regtest=1',
      '-txnotokens=0',
      '-logtimemicros',
      '-txindex=1',
      '-acindex=1',
      '-amkheight=0',
      '-bayfrontheight=1',
      '-bayfrontgardensheight=2',
      '-clarkequayheight=3',
      '-dakotaheight=4',
      '-dakotacrescentheight=5',
      '-eunosheight=6',
      '-eunospayaheight=7',
      '-fortcanningheight=8',
      '-fortcanningmuseumheight=9',
      '-fortcanninghillheight=10',
      '-fortcanningroadheight=11',
      '-fortcanningcrunchheight=12',
      '-fortcanningspringheight=13',
      '-fortcanninggreatworldheight=14',
      '-fortcanningepilogueheight=15'
    ],
    mainnet: [],
    devnet: [],
    masternode: [
      '-dummypos=0',
      '-spv=1',
      '-anchorquorum=2'
    ]
  }

  /**
   * Convenience Cmd builder
   */
  protected generateCmd (): string[] {
    const { defaultCmd } = NativeChainContainer

    const authCmd = [
      `-rpcuser=${this.rpcUser}`,
      `-rpcpassword=${this.rpcPassword}`
    ]

    const masterNodeOperator = (this.masterNodeKey != null)
      ? [`-masternode_operator=${this.masterNodeKey.operator.address}`]
      : []

    return [
      ...defaultCmd.prepend,
      ...authCmd,
      ...defaultCmd[this.blockchainNetwork.name],
      ...this.hasPreconfiguredMasternode ? defaultCmd.masternode : [],
      ...masterNodeOperator,
      ...this.addedCmds
    ]
  }

  private readonly addedCmds: string[] = []
  public addCmd (newCmd: string): this {
    this.addedCmds.push(newCmd)
    return this
  }

  /**
   * Create container and start it immediately waiting for NativeChain to be ready
   */
  public async start (): Promise<StartedNativeChainContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.ports : Object.values(this.blockchainNetwork.ports)))
      .withName(this.name ?? this.generateName())
      .withCommand(this.command.length > 0 ? this.command.concat(this.addedCmds) : this.generateCmd())

    const {
      rpcUser,
      rpcPassword,
      blockchainNetwork,
      masterNodeKey
    } = this
    const startedContainer = new StartedNativeChainContainer(
      await super.start(),
      { rpcUser, rpcPassword, blockchainNetwork, masterNodeKey }
    )

    if (masterNodeKey != null) {
      await startedContainer.call('importprivkey', [masterNodeKey.operator.privKey, 'operator', true])
      await startedContainer.call('importprivkey', [masterNodeKey.owner.privKey, 'owner', true])
    }

    return startedContainer
  }
}

export interface StartedContainerConfig {
  rpcUser: string
  rpcPassword: string
  blockchainNetwork: BlockchainNetwork
  masterNodeKey?: MasterNodeKey
}

export class StartedNativeChainContainer extends AbstractStartedContainer {
  private assumedSpvHeight: number = 0
  static SPV_EXPIRATION = 10
  private rpcUrl: string

  constructor (
    startedTestContainer: StartedTestContainer,
    protected readonly config: StartedContainerConfig
  ) {
    super(startedTestContainer)
    this.rpcUrl = this.generateRpcUrl()
  }

  private generateRpcUrl (): string {
    const {
      rpcUser,
      rpcPassword,
      blockchainNetwork
    } = this.config
    const port = this.getMappedPort(blockchainNetwork.ports.rpc)
    // TODO: hardcoded to 127.0.0.1 -- might wanna change this to use this.getIpAddress(networkName)? How to get networkName?
    return `http://${rpcUser}:${rpcPassword}@127.0.0.1:${port}/`
  }

  public getRpcUrl (): string {
    return this.rpcUrl
  }

  async restart (options?: Partial<RestartOptions> | undefined): Promise<void> {
    await super.restart(options)
    this.rpcUrl = this.generateRpcUrl()
  }

  /**
   * Set contents of ~/.defi/defi.conf
   * @param {string[]} options to set
   */
  async setDeFiConf (options: string[]): Promise<void> {
    if (options.length > 0) {
      const fileContents = `${options.join('\n')}\n`
      await this.exec(['bash', '-c', `echo "${fileContents}" > ~/.defi/defi.conf`])
    }
  }

  async getJsonRpcClient (): Promise<JsonRpcClient> {
    return new JsonRpcClient(this.rpcUrl)
  }

  /**
   * For convenience sake, utility rpc for the current node.
   * JSON 'result' is parsed and returned
   * @throws NativeChainRpcError is raised for RPC errors
   */
  async call (method: string, params: any = []): Promise<any> {
    const body = JSON.stringify({
      jsonrpc: '1.0',
      id: Math.floor(Math.random() * 100000000000000),
      method: method,
      params: params
    })

    const text = await this.post(body)
    const {
      result,
      error
    } = JSON.parse(text)

    if (error !== undefined && error !== null) {
      throw new NativeChainRpcError(error)
    }

    return result
  }

  /**
   * For convenience’s sake, HTTP POST to the RPC URL for the current node.
   * Not error checked, returns the raw JSON as string.
   */
  async post (body: string): Promise<string> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      body: body
    })
    return await response.text()
  }

  /**
   * Convenience method to getmininginfo, typing mapping is non-exhaustive
   */
  async getMiningInfo (): Promise<{ blocks: number, chain: string }> {
    return await this.call('getmininginfo', [])
  }

  /**
   * Convenience method to getblockcount, typing mapping is non exhaustive
   */
  async getBlockCount (): Promise<number> {
    return await this.call('getblockcount', [])
  }

  /**
   * Convenience method to getbestblockhash, typing mapping is non-exhaustive
   */
  async getBestBlockHash (): Promise<string> {
    return await this.call('getbestblockhash', [])
  }

  /**
   * Connect another node
   * @param {string} ip
   * @return {Promise<void>}
   */
  async addNode (ip: string): Promise<void> {
    return await this.call('addnode', [ip, 'onetry'])
  }

  async getNewAddress (label: string = '', addressType: 'legacy' | 'p2sh-segwit' | 'bech32' | string = 'bech32'): Promise<string> {
    return await this.call('getnewaddress', [label, addressType])
  }

  /** ---- MASTERNODE FUNCTIONS  ---- */
  /**
   * @param {number} nblocks to generate
   * @param {string} address to generate to
   * @param {number} maxTries
   */
  async generate (nblocks: number, address: string | undefined = this.config.masterNodeKey?.operator.address, maxTries: number = 1000000): Promise<void> {
    if (address == null) {
      throw new Error('Undefined address to generate to. Please specify an address or initialize the container with a MasterNodeKey.')
    }
    for (let minted = 0, tries = 0; minted < nblocks && tries < maxTries; tries++) {
      const result = await this.call('generatetoaddress', [1, address, 1])
      if (result === 1) {
        minted += 1
      }
    }
  }

  /**
   * @param {number} nblocks to generate
   * @param {number} timeout
   * @param {string} address
   */
  async waitForGenerate (nblocks: number, timeout: number = 590000, address: string | undefined = this.config.masterNodeKey?.operator.address): Promise<void> {
    const target = await this.getBlockCount() + nblocks

    return await waitForCondition(async () => {
      const count = await this.getBlockCount()
      if (count > target) {
        return true
      }
      await this.generate(1, address)
      return false
    }, timeout, 100, 'waitForGenerate')
  }

  /**
   * Wait for block height by minting towards the target
   *
   * @param {number} height to wait for
   * @param {number} [timeout=590000] in ms
   */
  async waitForBlockHeight (height: number, timeout: number = 590000): Promise<void> {
    return await waitForCondition(async () => {
      const count = await this.getBlockCount()
      if (count > height) {
        return true
      }
      await this.generate(1)
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
  async waitForWalletCoinbaseMaturity (timeout: number = 180000, mockTime: boolean = true): Promise<void> {
    if (!mockTime) {
      return await this.waitForBlockHeight(100, timeout)
    }

    let fakeTime: number = 1579045065
    await this.call('setmocktime', [fakeTime])

    const intervalId = setInterval(() => {
      fakeTime += 3
      void this.call('setmocktime', [fakeTime])
    }, 200)

    await this.waitForBlockHeight(100, timeout)

    clearInterval(intervalId)
    await this.call('setmocktime', [0])
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
  async waitForWalletBalanceGTE (balance: number, timeout: number = 300000): Promise<void> {
    return await waitForCondition(async () => {
      const getbalance = await this.call('getbalance')
      if (getbalance >= balance) {
        return true
      }
      await this.generate(1)
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
  async waitForAnchorTeams (nodesLength: number, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const anchorTeams = await this.call('getanchorteams')
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
  async waitForAnchorAuths (nodesLength: number, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const auths = await this.call('spv_listanchorauths')
      return auths.length > 0 && auths[0].signers === nodesLength
    }, timeout, 100, 'waitForAnchorAuths')
  }

  /**
   * Wait for anchor reward confirms
   *
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async waitForAnchorRewardConfirms (timeout: number = 30000): Promise<void> {
    // extra info here
    // max signers in regtest is 3, others are 5
    // majority is defined as 66% above
    const majority = 2
    return await waitForCondition(async () => {
      const confirms = await this.call('spv_listanchorrewardconfirms')
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
  async waitForPriceValid (fixedIntervalPriceId: string, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const data: any = await this.call('getfixedintervalprice', [fixedIntervalPriceId])
      // eslint-disable-next-line
      if (!data.isLive) {
        await this.generate(1)
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
  async waitForPriceInvalid (fixedIntervalPriceId: string, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const data: any = await this.call('getfixedintervalprice', [fixedIntervalPriceId])
      // eslint-disable-next-line
      if (data.isLive) {
        await this.generate(1)
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
  async waitForVaultState (vaultId: string, state: string, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const vault = await this.call('getvault', [vaultId])
      if (vault.state !== state) {
        await this.generate(1)
        return false
      }
      return true
    }, timeout, 100, 'waitForVaultState')
  }

  /**
   * Get next price block before the given target block
   *
   * @param {string} fixedIntervalPriceId
   * @param {number} [targetBlock]
   * @return {Promise<number>}
   */
  async getImmediatePriceBlockBeforeBlock (fixedIntervalPriceId: string, targetBlock: number): Promise<number> {
    const data: any = await this.call('getfixedintervalprice', [fixedIntervalPriceId])
    let nextPriceBlock = data.nextPriceBlock as number
    while (nextPriceBlock < targetBlock) {
      nextPriceBlock += 6 // 1 hour in regtest is 6 blocks
    }
    return nextPriceBlock
  }

  /**
   * Wait for active price
   *
   * @param {string} fixedIntervalPriceId
   * @param {string} activePrice
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async waitForActivePrice (fixedIntervalPriceId: string, activePrice: string, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const data: any = await this.call('getfixedintervalprice', [fixedIntervalPriceId])
      // eslint-disable-next-line
      if (data.activePrice.toString() !== activePrice) {
        await this.generate(1)
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
  async waitForNextPrice (fixedIntervalPriceId: string, nextPrice: string, timeout: number = 30000): Promise<void> {
    return await waitForCondition(async () => {
      const data: any = await this.call('getfixedintervalprice', [fixedIntervalPriceId])
      // eslint-disable-next-line
      if (data.nextPrice.toString() !== nextPrice) {
        await this.generate(1)
        return false
      }
      return true
    }, timeout, 100, 'waitForNextPrice')
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
    const txid = await this.call('sendtoaddress', [address, amount])
    await this.generate(1)

    const { vout }: {
      vout: Array<{
        n: number
        scriptPubKey: {
          addresses: string[]
        }
      }>
    } = await this.call('getrawtransaction', [txid, true])
    for (const out of vout) {
      if (out.scriptPubKey.addresses.includes(address)) {
        return {
          txid,
          vout: out.n
        }
      }
    }

    throw new Error('getrawtransaction will always return the required vout')
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
    const address = await this.call('getnewaddress', ['', 'bech32'])
    const privKey = await this.call('dumpprivkey', [address])
    const getaddressinfo = await this.call('getaddressinfo', [address])
    return {
      address,
      privKey,
      pubKey: getaddressinfo.pubkey
    }
  }

  /** ---- SPV FUNCTIONS  ---- */
  /**
   * Funds a Bitcoin address with 1 BTC(for test purposes only)
   *
   * @param {number} address A bitcoin address
   * @return {string} txid
   */
  async spvFundAddress (address: string): Promise<string> {
    return await this.call('spv_fundaddress', [address])
  }

  /**
   * Set last processed block height.
   *
   * @param {number} height BTC chain height
   */
  async spvSetLastHeight (height: number): Promise<void> {
    this.assumedSpvHeight = height
    return await this.call('spv_setlastheight', [height])
  }

  async increaseSpvHeight (height: number = StartedNativeChainContainer.SPV_EXPIRATION): Promise<void> {
    return await this.spvSetLastHeight(this.assumedSpvHeight + height)
  }
}

/**
 * RPC error from container
 */
export class NativeChainRpcError extends Error {
  constructor (error: { code: number, message: string }) {
    super(`NativeChainRpcError: '${error.message}', code: ${error.code}`)
  }
}
