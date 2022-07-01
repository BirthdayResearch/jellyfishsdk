import { RpcApiError } from '@defichain/jellyfish-api-core'
import { GenesisKeys, MasterNodeRegTestContainer, StartFlags } from '@defichain/testcontainers'
import { createPoolPair, createToken } from '@defichain/testing'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { Testing } from '@defichain/jellyfish-testing'
import { UTXO } from '@defichain/jellyfish-api-core/dist/category/masternode'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    const govBefore = await client.masternode.getGov('LP_SPLITS')
    expect(Object.keys(govBefore.LP_SPLITS).length).toStrictEqual(0)

    await createToken(container, 'CAT')
    await createToken(container, 'DOG')
    await createPoolPair(container, 'CAT', 'DFI')
    await createPoolPair(container, 'DOG', 'DFI')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should setGov LP_SPLITS', async () => {
    await client.masternode.setGov({ LP_SPLITS: { 3: 0.2, 4: 0.8 } })
    await container.generate(1)

    const govAfter = await client.masternode.getGov('LP_SPLITS')
    expect(govAfter.LP_SPLITS['3'].toString()).toStrictEqual('0.2')
    expect(govAfter.LP_SPLITS['4'].toString()).toStrictEqual('0.8')
  })

  it('should setGov with specific utxos', async () => {
    const utxo = await container.fundAddress(GenesisKeys[0].owner.address, 10)

    { // before utxo spent
      const utxos = await container.call('listunspent')
      const found = utxos.find((u: UTXO) => u.txid === utxo.txid && u.vout === utxo.vout)
      expect(found).not.toStrictEqual(undefined)
    }

    await client.masternode.setGov({ LP_SPLITS: { 3: 0.3, 4: 0.7 } }, [utxo])
    await container.generate(1)

    const govAfter = await client.masternode.getGov('LP_SPLITS')
    expect(govAfter.LP_SPLITS['3'].toString()).toStrictEqual('0.3')
    expect(govAfter.LP_SPLITS['4'].toString()).toStrictEqual('0.7')

    { // after utxo spent
      const utxos = await container.call('listunspent')
      const found = utxos.find((u: UTXO) => u.txid === utxo.txid && u.vout === utxo.vout)
      expect(found).toStrictEqual(undefined)
    }
  })

  it('should fail if GovVar key is not registered', async () => {
    const promise = client.masternode.setGov({ INVALID: 'value' })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Variable INVALID not registered')
  })

  it('should be failed to setGov LP_REWARD as manually set after Eunos hard fork is not allowed', async () => {
    const promise = client.masternode.setGov({ LP_DAILY_DFI_REWARD: 999.00293001 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('LP_DAILY_DFI_REWARD: Cannot be set manually after Eunos hard fork')
  })
})

describe('Masternode setGov ATTRIBUTES', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)
  const attributeKey = 'ATTRIBUTES'
  let key: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    // setup loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await testing.generate(1)

    const address = await container.call('getnewaddress')
    const metadata = {
      symbol: 'BTC',
      name: 'BTC Token',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await testing.rpc.token.createToken(metadata)
    await testing.generate(1)

    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    const dusdId = Object.keys(dusdInfo)[0]
    key = `v0/token/${dusdId}`
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should setGov with loan_payback and loan_payback_fee_pct', async () => {
    const key0 = `${key}/loan_payback/1`
    const key1 = `${key}/loan_payback/2`
    const key2 = `${key}/loan_payback_fee_pct/1`
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key0]: 'true', [key1]: 'true', [key2]: '0.25' } })
    await testing.container.generate(1)

    const govAfter = await testing.rpc.masternode.getGov(attributeKey)
    expect(govAfter.ATTRIBUTES[key0].toString()).toStrictEqual('true')
    expect(govAfter.ATTRIBUTES[key1].toString()).toStrictEqual('true')
    expect(govAfter.ATTRIBUTES[key2].toString()).toStrictEqual('0.25')
  })

  it('should setGov dfi keys with loan_payback and loan_payback_fee_pct', async () => {
    const key0 = `${key}/loan_payback/0`
    const key1 = `${key}/loan_payback_fee_pct/0`
    await testing.rpc.masternode.setGov({ [attributeKey]: { [key0]: 'false', [key1]: '0.35' } })
    await testing.container.generate(1)

    const govAfter = await testing.rpc.masternode.getGov(attributeKey)
    expect(govAfter.ATTRIBUTES[key0]).toBeUndefined()
    expect(govAfter.ATTRIBUTES[key1]).toBeUndefined()

    const key2 = `${key}/payback_dfi`
    const key3 = `${key}/payback_dfi_fee_pct`
    expect(govAfter.ATTRIBUTES[key2].toString()).toStrictEqual('false')
    expect(govAfter.ATTRIBUTES[key3].toString()).toStrictEqual('0.35')
  })
})

describe('Masternode setGov ATTRIBUTES dfip2206f for DFI-to-DUSD', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)
  const fortCanningSpringHeight = 120

  beforeEach(async () => {
    const startFlags: StartFlags[] = [{ name: 'fortcanningspringheight', value: fortCanningSpringHeight }]
    await testing.container.start({ startFlags: startFlags })
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should setGov dfip2206f', async () => {
    const attributesBefore = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributesBefore.ATTRIBUTES['v0/params/dfip2206f/active']).toBeUndefined()

    // should not set before fortcanningspring
    {
      expect(await testing.rpc.blockchain.getBlockCount()).toBeLessThan(fortCanningSpringHeight)
      const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206f/active': 'true' } })
      await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: Cannot be set before FortCanningSpringHeight\', code: -32600, method: setgov')
    }

    // move to fortcanningspring
    await testing.generate(fortCanningSpringHeight - await testing.container.getBlockCount())

    // set the dfip2206f to true
    {
      await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206f/active': 'true' } })
      await testing.container.generate(1)

      const attributesAfter = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributesAfter.ATTRIBUTES['v0/params/dfip2206f/active']).toStrictEqual('true')
    }

    // set the dfip2206f to false
    {
      await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206f/active': 'false' } })
      await testing.container.generate(1)

      const attributesAfter = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributesAfter.ATTRIBUTES['v0/params/dfip2206f/active']).toStrictEqual('false')
    }

    // try to set value other than true/false
    {
      const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206f/active': 'INVALID' } })
      await expect(promise).rejects.toThrow('RpcApiError: \'Boolean value must be either "true" or "false"\', code: -5, method: setgov')
    }

    // set the rest of dfip2206f's value
    {
      const startBlock = 10 + await testing.container.getBlockCount()
      await testing.rpc.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/dfip2206f/reward_pct': '0.05',
          'v0/params/dfip2206f/block_period': '25',
          'v0/params/dfip2206f/start_block': `${startBlock}`
        }
      })
      await testing.generate(1)

      await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206f/active': 'true' } })
      await testing.generate(startBlock - await testing.container.getBlockCount())

      // Retrieve and verify gov vars
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES['v0/params/dfip2206f/active']).toStrictEqual('true')
      expect(attributes.ATTRIBUTES['v0/params/dfip2206f/reward_pct']).toStrictEqual('0.05')
      expect(attributes.ATTRIBUTES['v0/params/dfip2206f/block_period']).toStrictEqual('25')
      expect(attributes.ATTRIBUTES['v0/params/dfip2206f/start_block']).toStrictEqual(`${startBlock}`)
    }
  })
})
