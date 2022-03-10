import { BigNumber, RpcApiError } from '@defichain/jellyfish-api-core'
import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createPoolPair, createToken } from '@defichain/testing'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { Testing } from '@defichain/jellyfish-testing'

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
      const found = utxos.find((u: any) => u.txid === utxo.txid && u.vout === utxo.vout)
      expect(found).not.toStrictEqual(undefined)
    }

    await client.masternode.setGov({ LP_SPLITS: { 3: 0.3, 4: 0.7 } }, [utxo])
    await container.generate(1)

    const govAfter = await client.masternode.getGov('LP_SPLITS')
    expect(govAfter.LP_SPLITS['3'].toString()).toStrictEqual('0.3')
    expect(govAfter.LP_SPLITS['4'].toString()).toStrictEqual('0.7')

    { // after utxo spent
      const utxos = await container.call('listunspent')
      const found = utxos.find((u: any) => u.txid === utxo.txid && u.vout === utxo.vout)
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
  const loanSchemeId = 'scheme'
  const attributeKey = 'ATTRIBUTES'
  const dusdLoanAmount = 5000
  let key: string

  async function setupForDUSDLoan (): Promise<void> {
    const vaultOwnerAddress = await testing.generateAddress()
    await testing.token.dfi({ amount: 1000000, address: vaultOwnerAddress })
    await testing.generate(1)

    // setup oracle
    const oracleAddress = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' }
    ]

    const oracleId = await testing.rpc.oracle.appointOracle(oracleAddress, priceFeeds, { weightage: 1 })
    await testing.generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1000@TSLA', currency: 'USD' }] })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DUSD', currency: 'USD' }] })
    await testing.generate(1)

    // setup collateral token
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    // setup loan token
    await testing.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })

    // setup loan scheme
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: loanSchemeId
    })
    await testing.generate(1)

    // create vault
    const vaultId = await testing.rpc.loan.createVault({
      ownerAddress: vaultOwnerAddress,
      loanSchemeId: loanSchemeId
    })

    await testing.generate(1)
    await testing.container.waitForPriceValid('DFI/USD')

    // deposite collateral
    await testing.rpc.loan.depositToVault({
      vaultId: vaultId,
      from: vaultOwnerAddress,
      amount: '100000@DFI'
    })
    await testing.generate(1)

    // take DUSD as loan
    await testing.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: `${dusdLoanAmount}@DUSD`,
      to: vaultOwnerAddress
    })
    await testing.generate(1)
  }

  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setupForDUSDLoan()
    const dusdInfo = await testing.rpc.token.getToken('DUSD')
    const dusdId = Object.keys(dusdInfo)[0]
    key = `v0/token/${dusdId}`
  })

  afterEach(async () => {
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
