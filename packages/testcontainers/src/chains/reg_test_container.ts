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
   */
  async waitForWalletCoinbaseMaturity (): Promise<void> {
    await this.generate(100)
  }
}
