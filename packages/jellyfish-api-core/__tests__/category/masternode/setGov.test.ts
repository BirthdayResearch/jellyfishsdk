import { BigNumber, RpcApiError } from '@defichain/jellyfish-api-core'
import { GenesisKeys, MasterNodeRegTestContainer, StartFlags } from '@defichain/testcontainers'
import { createPoolPair, createToken } from '@defichain/testing'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
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

describe('Masternode setGov poolpair ATTRIBUTES', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  const fortCanningSpringHeight = 120

  let collateralAddress: string
  let oracleId: string
  let ppTokenID: string
  let vaultId: string

  async function setup (): Promise<void> {
    collateralAddress = await testing.generateAddress()

    await testing.token.dfi({
      address: collateralAddress,
      amount: 300000
    })
    await testing.generate(1)

    await testing.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(1),
      id: 'default'
    })
    await testing.generate(1)

    oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(),
      [{
        token: 'DFI',
        currency: 'USD'
      }, {
        token: 'TSLA',
        currency: 'USD'
      }],
      { weightage: 1 })
    await testing.generate(1)

    await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [{
        tokenAmount: '1@DFI',
        currency: 'USD'
      }, {
        tokenAmount: '1@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    await testing.container.waitForActivePrice('TSLA/USD', '1')

    vaultId = await testing.rpc.vault.createVault({
      ownerAddress: collateralAddress,
      loanSchemeId: 'default'
    })
    await testing.generate(1)
  }

  beforeEach(async () => {
    const startFlags: StartFlags[] = [{ name: 'fortcanningspringheight', value: fortCanningSpringHeight }]
    await testing.container.start({ startFlags: startFlags })
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  async function depositToVault (): Promise<void> {
    await testing.rpc.vault.depositToVault({
      vaultId, from: collateralAddress, amount: '1@DFI'
    })
    await testing.generate(1)
  }

  async function depositToVaultAndTakeLoan (): Promise<void> {
    await depositToVault()

    await testing.rpc.loan.takeLoan({
      vaultId,
      amounts: '1@TSLA'
    })
    await testing.generate(1)
  }

  async function poolPairSetup (): Promise<void> {
    await depositToVaultAndTakeLoan()

    await testing.poolpair.create({
      tokenA: 'TSLA',
      tokenB: 'DFI'
    })
    await testing.generate(1)

    await testing.poolpair.add({
      a: { symbol: 'TSLA', amount: 1 },
      b: { symbol: 'DFI', amount: 1 }
    })
    await testing.generate(1)

    ppTokenID = Object.keys(await testing.rpc.token.getToken('TSLA-DFI'))[0]

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/poolpairs/${ppTokenID}/token_a_fee_pct`]: '0.01',
        [`v0/poolpairs/${ppTokenID}/token_b_fee_pct`]: '0.03'
      }
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ LP_SPLITS: { [Number(ppTokenID)]: 1 } })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({ LP_LOAN_TOKEN_SPLITS: { [Number(ppTokenID)]: 1 } })
    await testing.generate(1)
  }

  it('should setGov pool pair attributes', async () => {
    await poolPairSetup()

    // must wait until block count reaches fort canning spring height
    const blockCount = await testing.container.getBlockCount()
    await testing.generate(fortCanningSpringHeight - blockCount)

    // should set value 'both'
    {
      await testing.rpc.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_a_fee_direction`]: 'both',
          [`v0/poolpairs/${ppTokenID}/token_b_fee_direction`]: 'both'
        }
      })
      await testing.container.generate(1)

      const govAfter = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(govAfter.ATTRIBUTES[`v0/poolpairs/${ppTokenID}/token_a_fee_direction`].toString()).toStrictEqual('both')
      expect(govAfter.ATTRIBUTES[`v0/poolpairs/${ppTokenID}/token_b_fee_direction`].toString()).toStrictEqual('both')
    }

    // should set value 'in'
    {
      await testing.rpc.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_a_fee_direction`]: 'in',
          [`v0/poolpairs/${ppTokenID}/token_b_fee_direction`]: 'in'
        }
      })
      await testing.container.generate(1)

      const govAfter = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(govAfter.ATTRIBUTES[`v0/poolpairs/${ppTokenID}/token_a_fee_direction`].toString()).toStrictEqual('in')
      expect(govAfter.ATTRIBUTES[`v0/poolpairs/${ppTokenID}/token_b_fee_direction`].toString()).toStrictEqual('in')
    }

    // should set value 'out'
    {
      await testing.rpc.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_a_fee_direction`]: 'out',
          [`v0/poolpairs/${ppTokenID}/token_b_fee_direction`]: 'out'
        }
      })
      await testing.container.generate(1)

      const govAfter = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(govAfter.ATTRIBUTES[`v0/poolpairs/${ppTokenID}/token_a_fee_direction`].toString()).toStrictEqual('out')
      expect(govAfter.ATTRIBUTES[`v0/poolpairs/${ppTokenID}/token_b_fee_direction`].toString()).toStrictEqual('out')
    }
  })

  it('should not setGov invalid pool pair attribute value', async () => {
    await poolPairSetup()

    // must wait until block count reaches fort canning spring height
    const blockCount = await testing.container.getBlockCount()
    await testing.generate(fortCanningSpringHeight - blockCount)

    // Try to set invalid value
    const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/poolpairs/${ppTokenID}/token_a_fee_direction`]: 'invalid' } })
    await expect(promise).rejects.toThrow('RpcApiError: \'Fee direction value must be both, in or out\', code: -5, method: setgov')
  })

  it('should not set token_a_fee_direction before fort canning spring height', async () => {
    await poolPairSetup()

    // Try to set invalid value
    const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/poolpairs/${ppTokenID}/token_a_fee_direction`]: 'both' } })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: Cannot be set before FortCanningSpringHeight\', code: -32600, method: setgov')
  })
})

describe('setGov ATTRIBUTES loan dusd burn keys', () => {
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

  it('should setGov dusd_interest_burn', async () => {
    const attributesBefore = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributesBefore.ATTRIBUTES['v0/params/dfip2206a/dusd_interest_burn']).toBeUndefined()

    // should not set before fortcanningspring
    {
      expect(await testing.rpc.blockchain.getBlockCount()).toBeLessThan(fortCanningSpringHeight)
      const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206a/dusd_interest_burn': 'true' } })
      await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: Cannot be set before FortCanningSpringHeight\', code: -32600, method: setgov')
    }

    // move to fortcanningspring
    await testing.generate(fortCanningSpringHeight - await testing.container.getBlockCount())

    // set the dusd_interest_burn to true
    {
      await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206a/dusd_interest_burn': 'true' } })
      await testing.container.generate(1)

      const attributesAfter = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributesAfter.ATTRIBUTES['v0/params/dfip2206a/dusd_interest_burn']).toStrictEqual('true')
    }

    // set the dusd_interest_burn to false
    {
      await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206a/dusd_interest_burn': 'false' } })
      await testing.container.generate(1)

      const attributesAfter = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributesAfter.ATTRIBUTES['v0/params/dfip2206a/dusd_interest_burn']).toStrictEqual('false')
    }

    // try to set value other than true/false
    {
      const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206a/dusd_interest_burn': 'INVALID' } })
      await expect(promise).rejects.toThrow('RpcApiError: \'Boolean value must be either "true" or "false"\', code: -5, method: setgov')
    }
  })

  it('should setGov dusd_loan_burn', async () => {
    const attributesBefore = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributesBefore.ATTRIBUTES['v0/params/dfip2206a/dusd_loan_burn']).toBeUndefined()

    // should not set before fortcanningspring
    {
      expect(await testing.rpc.blockchain.getBlockCount()).toBeLessThan(fortCanningSpringHeight)
      const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206a/dusd_loan_burn': 'true' } })
      await expect(promise).rejects.toThrow('RpcApiError: \'Test SetGovVariableTx execution failed:\nATTRIBUTES: Cannot be set before FortCanningSpringHeight\', code: -32600, method: setgov')
    }

    // move to fortcanningspring
    await testing.generate(fortCanningSpringHeight - await testing.container.getBlockCount())

    // set the dusd_loan_burn to true
    {
      await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206a/dusd_loan_burn': 'true' } })
      await testing.container.generate(1)

      const attributesAfter = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributesAfter.ATTRIBUTES['v0/params/dfip2206a/dusd_loan_burn']).toStrictEqual('true')
    }

    // set the dusd_loan_burn to false
    {
      await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206a/dusd_loan_burn': 'false' } })
      await testing.container.generate(1)

      const attributesAfter = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributesAfter.ATTRIBUTES['v0/params/dfip2206a/dusd_loan_burn']).toStrictEqual('false')
    }

    // try to set value other than true/false
    {
      const promise = testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/dfip2206a/dusd_loan_burn': 'INVALID' } })
      await expect(promise).rejects.toThrow('RpcApiError: \'Boolean value must be either "true" or "false"\', code: -5, method: setgov')
    }
  })
})

describe.skip('setGov consortium ATTRIBUTES', () => {
  const tGroup = TestingGroup.create(2)
  let account0: string, account1: string
  let idBTC: string
  const symbolBTC = 'BTC'

  beforeAll(async () => {
    await tGroup.start()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    account0 = await tGroup.get(0).generateAddress()
    account1 = await tGroup.get(1).generateAddress()

    await tGroup.get(0).token.create({
      symbol: symbolBTC,
      name: symbolBTC,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: account0
    })

    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.fundAddress(account1, 10)

    idBTC = await tGroup.get(0).token.getTokenId(symbolBTC)
  }

  async function setGovAttr (ATTRIBUTES: object): Promise<string> {
    const hash = await tGroup.get(0).rpc.masternode.setGov({ ATTRIBUTES })
    await tGroup.get(0).generate(1)
    return hash
  }

  it('should throw an error if \'v0/params/feature/consortium\' is not assigned a boolean', async () => {
    const promise = tGroup.get(0).rpc.masternode.setGov({
      ATTRIBUTES: { 'v0/params/feature/consortium': '1' }
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Boolean value must be either "true" or "false"\', code: -5, method: setgov')
  })

  it('should throw an error if the member owner address is empty', async () => {
    const promise = setGovAttr({
      [`v0/consortium/${idBTC}/members`]: {
        '01': {
          name: 'test',
          ownerAddress: '',
          backingId: 'blablabla',
          mintLimit: 10.00000000
        }
      }
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Invalid ownerAddress in consortium member data',
        method: 'setgov'
      }
    })
  })

  it('should throw an error if the member owner address is invalid', async () => {
    const promise = setGovAttr({
      [`v0/consortium/${idBTC}/members`]: {
        '01': {
          name: 'test',
          ownerAddress: 'abc',
          backingId: 'blablabla',
          mintLimit: 10.00000000
        }
      }
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Invalid ownerAddress in consortium member data',
        method: 'setgov'
      }
    })
  })

  it('should throw an error if the consortium member name length is less than 3', async () => {
    const promise = setGovAttr({
      [`v0/consortium/${idBTC}/members`]: {
        '01': {
          name: 'ab',
          ownerAddress: account1,
          backingId: 'blablabla',
          mintLimit: 10.00000000
        }
      }
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Member name too short, must be at least 3 chars long',
        method: 'setgov'
      }
    })
  })

  it('should throw an error if the member mint limit is invalid', async () => {
    const promise = setGovAttr({
      [`v0/consortium/${idBTC}/members`]: {
        '01': {
          name: 'test',
          ownerAddress: account1,
          backingId: 'blablabla',
          mintLimit: -10.00000000
        }
      }
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Mint limit is an invalid amount',
        method: 'setgov'
      }
    })
  })

  it('should throw an error if the member daily mint limit is invalid', async () => {
    const promise = setGovAttr({
      [`v0/consortium/${idBTC}/members`]: {
        '01': {
          name: 'test',
          ownerAddress: account1,
          backingId: 'blablabla',
          mintLimit: 10.00000000,
          mintLimitDaily: -10.00000000
        }
      }
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Daily mint limit is an invalid amount',
        method: 'setgov'
      }
    })
  })

  it('should throw an error if the member status is invalid', async () => {
    const p1 = setGovAttr({
      [`v0/consortium/${idBTC}/members`]: {
        '01': {
          name: 'test',
          ownerAddress: account1,
          backingId: 'blablabla',
          mintLimit: 10.00000000,
          mintLimitDaily: 1.00000000,
          status: -1
        }
      }
    })

    await expect(p1).rejects.toThrow(RpcApiError)
    await expect(p1).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Status must be a positive number!',
        method: 'setgov'
      }
    })

    const p2 = setGovAttr({
      [`v0/consortium/${idBTC}/members`]: {
        '01': {
          name: 'test',
          ownerAddress: account1,
          backingId: 'blablabla',
          mintLimit: 10.00000000,
          mintLimitDaily: 1.00000000,
          status: 2
        }
      }
    })

    await expect(p2).rejects.toThrow(RpcApiError)
    await expect(p2).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Status can be either 0 or 1',
        method: 'setgov'
      }
    })
  })

  it('should allow global limit to be 0', async () => {
    expect(await setGovAttr({
      [`v0/consortium/${idBTC}/mint_limit`]: '0'
    })).toBeTruthy()
  })

  it('should set member information', async () => {
    expect(await setGovAttr({
      [`v0/consortium/${idBTC}/mint_limit`]: '10',
      [`v0/consortium/${idBTC}/mint_limit_daily`]: '2',
      [`v0/consortium/${idBTC}/members`]: {
        '01': {
          name: 'test',
          ownerAddress: account1,
          backingId: 'blablabla',
          mintLimit: 9.00000000,
          mintLimitDaily: 1.00000000,
          status: 1
        }
      }
    })).toBeTruthy()

    const attr = (await tGroup.get(0).rpc.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    expect(attr['v0/consortium/1/members']).toStrictEqual({
      '01': {
        name: 'test',
        ownerAddress: account1,
        backingId: 'blablabla',
        mintLimitDaily: new BigNumber(1),
        mintLimit: new BigNumber(9),
        status: new BigNumber(1)
      }
    })
  })

  it('should throw an error if global limit is set to negative value other than -1', async () => {
    const promise = setGovAttr({
      [`v0/consortium/${idBTC}/mint_limit`]: '-2'
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Amount must be positive or -1',
        method: 'setgov'
      }
    })
  })
})
