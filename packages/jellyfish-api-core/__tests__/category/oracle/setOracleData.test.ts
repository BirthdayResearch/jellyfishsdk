import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'

describe('Oracle', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should setOracleData', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    const prices = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]

    await client.oracle.setOracleData(oracleId, timestamp, { prices })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleId])

    expect(data).toStrictEqual(
      {
        weightage: 1,
        oracleid: oracleId,
        address: expect.any(String),
        priceFeeds,
        tokenPrices: [
          {
            token: 'AAPL',
            currency: 'EUR',
            amount: 0.5,
            timestamp
          }
        ]
      }
    )
  })

  it('test setOracleData should not update DUSD price', async () => {
    const priceFeeds = [{ token: 'DUSD', currency: 'USD' }]
    const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })
    await container.generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await client.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '12@DUSD', currency: 'USD' }] })
    await container.generate(1)

    await client.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await container.generate(13)

    const price = await container.call('getfixedintervalprice', ['DUSD/USD'])
    expect(price).toStrictEqual({
      fixedIntervalPriceId: 'DUSD/USD',
      activePrice: 1,
      nextPrice: 1, // should remain 1
      activePriceBlock: expect.any(Number),
      nextPriceBlock: expect.any(Number),
      timestamp: expect.any(Number),
      isLive: true
    })
  })

  it('should not setOracleData if oracleId is invalid', async () => {
    const oracleId = 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b'

    const prices = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]
    const promise = client.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'oracle <${oracleId as string}> not found', code: -32600, method: setoracledata`)
  })

  it('should not setOracleData if token and currency do not exist', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const prices = [{ tokenAmount: '0.5@TSLA', currency: 'USD' }]

    const promise = client.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Test SetOracleDataTx execution failed:\ntoken <TSLA> - currency <USD> is not allowed\', code: -32600, method: setoracledata')
  })

  it('should not setOracleData if the token amount is 1 trillion', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const prices = [{ tokenAmount: '1000000000000@AAPL', currency: 'EUR' }]

    const promise = client.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid amount\', code: -22, method: setoracledata')
  })

  it('should setOracleData with UTXOs', async () => {
    const address = await container.getNewAddress()

    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [address, priceFeeds, 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    const prices = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]

    const input = await container.fundAddress(address, 10)

    await client.oracle.setOracleData(oracleId, timestamp, { prices, utxos: [input] })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleId])

    expect(data).toStrictEqual(
      {
        weightage: 1,
        oracleid: oracleId,
        address: expect.any(String),
        priceFeeds,
        tokenPrices: [
          {
            token: 'AAPL',
            currency: 'EUR',
            amount: 0.5,
            timestamp
          }
        ]
      }
    )
  })

  it('should not setOracleData with arbitrary UTXOs', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    const prices = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]

    const { txid, vout } = await container.fundAddress(await container.getNewAddress(), 10)
    const promise = client.oracle.setOracleData(oracleId, timestamp, { prices, utxos: [{ txid, vout }] })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetOracleDataTx execution failed:\ntx must have at least one input from account owner\', code: -32600, method: setoracledata')
  })

  it('should return an error when setoracledata timestamp is greater than 5 minutes into the future', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000) + 4200
    const prices = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]

    const promise = client.oracle.setOracleData(oracleId, timestamp, { prices })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Timestamp (${timestamp}) is out of price update window`)
  })
})
