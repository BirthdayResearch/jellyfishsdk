import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'
import { UTXO } from '../../../src/category/oracle'

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
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const data = await client.oracle.removeOracle(oracleid)
    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    const promise = container.call('getoracledata', [oracleid])

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'oracle <${oracleid as string}> not found', code: -20`)
  })

  it('should not removeOracle if oracleid is invalid', async () => {
    const oracleid = 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b'
    const promise = client.oracle.removeOracle(oracleid)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test RemoveOracleAppointTx execution failed:\noracle <${oracleid as string}> not found', code: -32600, method: removeoracle`)
  })

  it('should removeOracle with utxos', async () => {
    const priceFeeds = [
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
    ]

    const address = await container.getNewAddress()
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const oracleid = await container.call('appointoracle', [address, priceFeeds, 1])

    await container.generate(1)

    const data = await client.oracle.removeOracle(oracleid, inputs)
    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    const promise = container.call('getoracledata', [oracleid])
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'oracle <${oracleid as string}> not found', code: -20`)
  })
})
