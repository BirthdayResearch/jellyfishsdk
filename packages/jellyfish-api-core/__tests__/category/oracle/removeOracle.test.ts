import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
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

  it('should removeOracle', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const data = await client.oracle.removeOracle(oracleId)

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    const promise = container.call('getoracledata', [oracleId])

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'oracle <${oracleId as string}> not found', code: -20`) // Removed
  })

  it('should not removeOracle if oracleId is invalid', async () => {
    const oracleId = 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b'
    const promise = client.oracle.removeOracle(oracleId)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test RemoveOracleAppointTx execution failed:\noracle <${oracleId as string}> not found', code: -32600, method: removeoracle`)
  })

  it('should not removeOracle with arbitrary utxos', async () => {
    const address = await container.getNewAddress()

    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [address, priceFeeds, 1])

    await container.generate(1)

    const { txid, vout } = await container.fundAddress(address, 10)

    const promise = client.oracle.removeOracle(oracleId, [{ txid, vout }])

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Test RemoveOracleAppointTx execution failed:\ntx not from foundation member\', code: -32600, method: removeoracle')
  })
})
