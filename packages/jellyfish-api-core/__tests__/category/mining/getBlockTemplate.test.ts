import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { Testing } from '@defichain/jellyfish-testing'

describe('get block template', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await testing.container.addNode('127.0.0.1')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should get a block template', async () => {
    const promise = await client.mining.getBlockTemplate({ rules: ['segwit'] })
    expect(promise).toStrictEqual({
      capabilities: ['proposal'],
      version: 536870912,
      rules: [],
      vbavailable: {},
      vbrequired: 0,
      previousblockhash: expect.any(String),
      transactions: [],
      coinbaseaux: { flags: '' },
      coinbasevalue: 3333000000,
      longpollid: expect.any(String),
      target: '7fffff0000000000000000000000000000000000000000000000000000000000',
      mintime: expect.any(Number),
      mutable: ['time', 'transactions', 'prevblock'],
      noncerange: '00000000ffffffff',
      sigoplimit: 1280000,
      sizelimit: 64000000,
      weightlimit: 64000000,
      curtime: expect.any(Number),
      bits: '207fffff',
      height: 102,
      default_witness_commitment: '6a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9'
    })
  })

  it('should throw an error if there is invalid mode', async () => {
    const promise = client.mining.getBlockTemplate({ mode: 'mode', rules: ['segwit'] })
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'Invalid mode',
        method: 'getblocktemplate'
      }
    })
  })

  it('should throw an error if there is no rules', async () => {
    const promise = client.mining.getBlockTemplate({ rules: [''] })
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'getblocktemplate must be called with the segwit rule set (call with {"rules": ["segwit"]})',
        method: 'getblocktemplate'
      }
    })
  })
})
