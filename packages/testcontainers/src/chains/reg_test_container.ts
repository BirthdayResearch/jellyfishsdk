import { DockerOptions } from 'dockerode'
import { DeFiDContainer, StartOptions } from './container'
import { GenesisKeys, MasterNodeKey } from '../testkeys'

export class RegTestContainer extends DeFiDContainer {
  constructor (options?: DockerOptions) {
    super('regtest', options)
  }

  protected getCmd (opts: StartOptions): string[] {
    return [...super.getCmd(opts),
      '-regtest=1',
      '-txnotokens=0',
      '-logtimemicros',
      '-txindex=1',
      '-acindex=1',
      '-amkheight=0',
      '-bayfrontheight=1',
      '-bayfrontgardensheight=2',
      '-clarkequayheight=3',
      '-dakotaheight=4',
      '-dakotacrescentheight=5'
    ]
  }

  async getNewAddress (label: string = '', addressType: 'legacy' | 'p2sh-segwit' | 'bech32' | string = 'bech32'): Promise<string> {
    return await this.call('getnewaddress', [label, addressType])
  }

  async getRpcPort (): Promise<string> {
    return await this.getPort('19554/tcp')
  }
}

/**
 * RegTest with MasterNode preconfigured
 */
export class MasterNodeRegTestContainer extends RegTestContainer {
  private readonly masternodeKey: MasterNodeKey

  constructor (masternodeKey: MasterNodeKey = GenesisKeys[0], options?: DockerOptions) {
    super(options)
    this.masternodeKey = masternodeKey
  }

  /**
   * Additional debug options turned on for traceability.
   */
  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-dummypos=1',
      '-nospv'
    ]
  }

  /**
   * It is set to auto mint every 1 second by default in regtest.
   * https://github.com/DeFiCh/ain/blob/6dc990c45788d6806ea/test/functional/test_framework/test_node.py#L160-L178
   */
  async generate (nblocks: number, address: string = this.masternodeKey.operator.address, maxTries: number = 1000000): Promise<string[]> {
    const mintedHashes: string[] = []

    for (let minted = 0, tries = 0; minted < nblocks && tries < maxTries; tries++) {
      const result = await this.call('generatetoaddress', [1, address, 1])

      if (result === 1) {
        minted += 1
        const count = await this.call('getblockcount')
        const hash = await this.call('getblockhash', [count])
        mintedHashes.push(hash)
      }
    }

    return mintedHashes
  }

  /**
   * This will automatically import the necessary private key for master to mint tokens
   */
  async waitForReady (timeout: number = 15000): Promise<void> {
    await super.waitForReady(timeout)

    // import keys for master node
    await this.call('importprivkey', [
      this.masternodeKey.operator.privKey, 'coinbase', true
    ])
    await this.call('importprivkey', [
      this.masternodeKey.owner.privKey, 'coinbase', true
    ])

    // configure the masternode
    const fileContents =
      'gen=1' + '\n' +
      'spv=1' + '\n' +
      `masternode_operator=${this.masternodeKey.operator.address}` + '\n' +
      `masternode_owner=${this.masternodeKey.owner.address}`

    await this.exec({
      Cmd: ['bash', '-c', `echo "${fileContents}" > ~/.defi/defi.conf`]
    })

    // restart and wait for ready
    await this.container?.stop()
    await this.container?.start()
    await super.waitForReady(timeout)
  }

  /**
   * Wait for master node wallet coin to be mature for spending.
   *
   * A coinbase transaction must be 100 blocks deep before you can spend its outputs.
   * This is a safeguard to prevent outputs that originate
   * from the coinbase transaction from becoming unspendable
   * (in the event the mined block moves out of the active chaindue to a fork).
   */
  async waitForWalletCoinbaseMaturity (): Promise<void> {
    await this.generate(100)
  }

  /**
   * Wait for in wallet balance to be greater than an amount.
   * This allow test that require fund to wait for fund to be filled up before running the tests.
   *
   * @param {number} balance to wait for in wallet to be greater than or equal
   * @param {number} timeout default to 30000ms
   * @see waitForWalletCoinbaseMaturity
   */
  async waitForWalletBalanceGTE (balance: number, timeout = 30000): Promise<void> {
    return await this.waitForCondition(async () => {
      const getbalance = await this.call('getbalance')
      return getbalance >= balance
    }, timeout)
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

    await this.waitForCondition(async () => {
      const { confirmations } = await this.call('gettxout', [txid, 0, true])
      return confirmations > 0
    }, 10000)

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
        return { txid, vout: out.n }
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
    return { address, privKey, pubKey: getaddressinfo.pubkey }
  }
}
