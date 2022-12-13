import { StartedNativeChainContainer } from './NativeChainContainer'
import fetch from 'cross-fetch'
import { DeFiDContainer, MasterNodeRegTestContainer } from '../index'

export class NativeChainRpc {
  private readonly rpcUrl: string
  private assumedSpvHeight: number = 0
  static SPV_EXPIRATION = 10

  constructor (private readonly sncc: StartedNativeChainContainer | DeFiDContainer | MasterNodeRegTestContainer, cachedRpcUrl?: string) {
    if (sncc instanceof StartedNativeChainContainer) {
      this.rpcUrl = NativeChainRpc.generateRpcUrl(sncc)
    } else {
      this.rpcUrl = cachedRpcUrl ?? ''
    }
  }

  public static generateRpcUrl (sncc: StartedNativeChainContainer): string {
    const {
      rpcUser,
      rpcPassword,
      blockchainNetwork
    } = sncc

    const port = sncc.getMappedPort(blockchainNetwork.ports.rpc)
    return `http://${rpcUser}:${rpcPassword}@${sncc.getHost()}:${port}/`
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
   * @param {number} nblocks to generate
   * @param {string} address to generate to
   * @param {number} maxTries
   */
  async generate (nblocks: number, address?: string | undefined, maxTries: number = 1000000): Promise<void> {
    if (address == null && this.sncc instanceof StartedNativeChainContainer) {
      address = this.sncc.masterNodeKey?.operator.address
    }
    if (address == null && this.sncc instanceof MasterNodeRegTestContainer) {
      address = this.sncc.masternodeKey?.operator.address
    } // legacy support
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

  async increaseSpvHeight (height: number = NativeChainRpc.SPV_EXPIRATION): Promise<void> {
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
