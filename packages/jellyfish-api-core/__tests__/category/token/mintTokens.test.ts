import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '../../../src'
import { Testing } from '@defichain/jellyfish-testing'

describe('Token', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let from: string

  async function setup (): Promise<void> {
    from = await container.getNewAddress()

    await createToken(from, 'DBTC')
    await testing.generate(1)

    await createToken(from, 'DETH')
    await testing.generate(1)

    await createToken(from, 'DBSC')
    await testing.generate(1)
  }

  async function createToken (address: string, symbol: string): Promise<void> {
    const defaultMetadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await testing.rpc.token.createToken(defaultMetadata)
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should mintTokens', async () => {
    let tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).not.toContain('7.00000000@1')

    const txid = await testing.rpc.token.mintTokens('7@DBTC')
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await container.generate(1)

    tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).toContain('7.00000000@1')
  })

  it('should mintTokens with 1 satoshi', async () => {
    let tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).not.toContain('0.00000001@2')

    const txid = await testing.rpc.token.mintTokens('0.00000001@DETH')
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)

    await container.generate(1)

    tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).toContain('0.00000001@2')
  })

  it('should mintTokens with utxos', async () => {
    let tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).not.toContain('6.00000000@3')

    const utxo = await container.fundAddress(from, 10)

    const txid = await testing.rpc.token.mintTokens('6@DBSC', [utxo])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await container.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)

    tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).toContain('6.00000000@3')
  })

  it('should not mintTokens if quantity = 0', async () => {
    const promise = testing.rpc.token.mintTokens('0@DBTC')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Amount out of range')
  })

  it('should not mintTokens if quantity = -1', async () => {
    const promise = testing.rpc.token.mintTokens('-1@DBTC')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Amount out of range')
  })

  it('should not mintTokens if quantity is less than 1 satoshi', async () => {
    const promise = testing.rpc.token.mintTokens('0.000000001@DBTC')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid amount')
  })

  it('should not mintTokens for non-existence token', async () => {
    const promise = testing.rpc.token.mintTokens('5@BTC')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: BTC\', code: 0, method: minttokens')
  })

  it('should not mintTokens if parameter is any arbitrary string', async () => {
    const promise = testing.rpc.token.mintTokens('abcde')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid amount')
  })

  it('should not mintTokens with arbitrary UTXOs', async () => {
    const utxo = await container.fundAddress(await testing.generateAddress(), 10)

    const promise = testing.rpc.token.mintTokens('5@DETH', [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Test MintTokenTx execution failed:\ntoken is DAT and tx not from foundation member')
  })
})
