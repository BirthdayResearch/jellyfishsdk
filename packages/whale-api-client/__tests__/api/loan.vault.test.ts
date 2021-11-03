import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiException } from '../../src'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LoanVaultState } from '../../src/api/loan'

const container = new LoanMasterNodeRegTestContainer()
const service = new StubService(container)
const client = new StubWhaleApiClient(service)
const testing = Testing.create(container)

let johnEmptyVaultId: string
let bobDepositedVaultId: string
let johnLoanedVaultId: string
let adamLiquidatedVaultId: string

/* eslint-disable no-lone-blocks */

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  { // DFI setup
    await testing.token.dfi({
      address: await testing.address('DFI'),
      amount: 40000
    })
  }

  { // Loan Scheme
    await testing.rpc.loan.createLoanScheme({
      id: 'default',
      minColRatio: 100,
      interestRate: new BigNumber(1)
    })
    await testing.generate(1)

    await testing.rpc.loan.createLoanScheme({
      id: 'scheme',
      minColRatio: 110,
      interestRate: new BigNumber(1)
    })
    await testing.generate(1)
  }

  let oracleId: string
  { // Oracle
    const oracleAddress = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'AAPL', currency: 'USD' },
      { token: 'GOOGL', currency: 'USD' }
    ]
    oracleId = await testing.rpc.oracle.appointOracle(oracleAddress, priceFeeds, { weightage: 1 })
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{ tokenAmount: '1@DFI', currency: 'USD' }]
    })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }]
    })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{ tokenAmount: '2@AAPL', currency: 'USD' }]
    })
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{ tokenAmount: '4@GOOGL', currency: 'USD' }]
    })
    await testing.generate(1)
  }

  { // Collateral Tokens
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
  }

  { // Loan Tokens
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'AAPL',
      fixedIntervalPriceId: 'AAPL/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'GOOGL',
      fixedIntervalPriceId: 'GOOGL/USD'
    })
    await testing.generate(1)
  }

  { // Vault Empty (John)
    johnEmptyVaultId = await testing.rpc.loan.createVault({
      ownerAddress: await testing.address('John'),
      loanSchemeId: 'default'
    })
    await testing.generate(1)
  }

  { // Vault Deposit Collateral (Bob)
    bobDepositedVaultId = await testing.rpc.loan.createVault({
      ownerAddress: await testing.address('Bob'),
      loanSchemeId: 'default'
    })
    await testing.generate(1)
    await testing.rpc.loan.depositToVault({
      vaultId: bobDepositedVaultId,
      from: await testing.address('DFI'),
      amount: '10000@DFI'
    })
    await testing.generate(1)
  }

  { // Vault Deposited & Loaned (John)
    johnLoanedVaultId = await testing.rpc.loan.createVault({
      ownerAddress: await testing.address('John'),
      loanSchemeId: 'scheme'
    })
    await testing.generate(1)
    await testing.rpc.loan.depositToVault({
      vaultId: johnLoanedVaultId,
      from: await testing.address('DFI'),
      amount: '10000@DFI'
    })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId: johnLoanedVaultId,
      amounts: '30@TSLA'
    })
    await testing.generate(1)
  }

  { // Vault Deposited, Loaned, Liquidated  (Adam)
    adamLiquidatedVaultId = await testing.rpc.loan.createVault({
      ownerAddress: await testing.address('Adam'),
      loanSchemeId: 'default'
    })
    await testing.generate(1)
    await testing.rpc.loan.depositToVault({
      vaultId: adamLiquidatedVaultId,
      from: await testing.address('DFI'),
      amount: '10000@DFI'
    })
    await testing.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId: adamLiquidatedVaultId,
      amounts: '30@AAPL'
    })
    await testing.generate(1)

    // Make vault enter under liquidation state by a price hike of the loan token
    const timestamp2 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp2, {
      prices: [{ tokenAmount: '1000@AAPL', currency: 'USD' }]
    })

    // Wait for 12 blocks which are equivalent to 2 hours (1 block = 10 minutes in regtest) in order to liquidate the vault
    await testing.generate(12)
  }
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('list', () => {
  it('should listVault with size only', async () => {
    const result = await client.loan.listVault(20)
    expect(result.length).toStrictEqual(4)
    result.forEach(e =>
      expect(e).toStrictEqual(expect.objectContaining({
        vaultId: expect.any(String),
        loanSchemeId: expect.any(String),
        ownerAddress: expect.any(String),
        state: expect.any(String)
      }))
    )
  })

  it('should listVault with size and pagination', async () => {
    const vaultIds = (await client.loan.listVault())
      .map(value => value.vaultId)

    const first = await client.loan.listVault(2)

    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual(vaultIds[1])

    expect(first[0].vaultId).toStrictEqual(vaultIds[0])
    expect(first[1].vaultId).toStrictEqual(vaultIds[1])

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual(vaultIds[3])

    expect(next[0].vaultId).toStrictEqual(vaultIds[2])
    expect(next[1].vaultId).toStrictEqual(vaultIds[3])

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})

describe('get', () => {
  it('should get johnEmptyVaultId', async () => {
    const vault = await client.loan.getVault(johnEmptyVaultId)
    expect(vault).toStrictEqual({
      vaultId: johnEmptyVaultId,
      loanSchemeId: 'default',
      ownerAddress: expect.any(String),
      state: LoanVaultState.ACTIVE,
      informativeRatio: '-1',
      collateralRatio: '-1',
      collateralValue: '0',
      loanValue: '0',
      interestValue: '0',
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: []
    })
  })

  it('should get bobDepositedVaultId', async () => {
    const vault = await client.loan.getVault(bobDepositedVaultId)
    expect(vault).toStrictEqual({
      vaultId: bobDepositedVaultId,
      loanSchemeId: 'default',
      ownerAddress: expect.any(String),
      state: LoanVaultState.ACTIVE,
      informativeRatio: '-1',
      collateralRatio: '-1',
      collateralValue: '10000',
      loanValue: '0',
      interestValue: '0',
      collateralAmounts: [
        {
          amount: '10000.00000000',
          displaySymbol: 'DFI',
          id: '0',
          name: 'Default Defi token',
          symbol: 'DFI',
          symbolKey: 'DFI'
        }
      ],
      loanAmounts: [],
      interestAmounts: []
    })
  })

  it('should get johnLoanedVaultId', async () => {
    const vault = await client.loan.getVault(johnLoanedVaultId)
    expect(vault).toStrictEqual({
      vaultId: johnLoanedVaultId,
      loanSchemeId: 'scheme',
      ownerAddress: expect.any(String),
      state: LoanVaultState.ACTIVE,
      collateralRatio: '16667',
      collateralValue: '10000',
      informativeRatio: '16666.61600015',
      loanValue: '60.0001824',
      interestValue: '0.0001824',
      collateralAmounts: [
        {
          amount: '10000.00000000',
          displaySymbol: 'DFI',
          id: '0',
          name: 'Default Defi token',
          symbol: 'DFI',
          symbolKey: 'DFI'
        }
      ],
      loanAmounts: [
        {
          amount: '30.00009120',
          displaySymbol: 'dTSLA',
          id: '1',
          name: '',
          symbol: 'TSLA',
          symbolKey: 'TSLA'
        }
      ],
      interestAmounts: [
        {
          amount: '0.00009120',
          displaySymbol: 'dTSLA',
          id: '1',
          name: '',
          symbol: 'TSLA',
          symbolKey: 'TSLA'
        }
      ]
    })
  })

  it('should get adamLiquidatedVaultId', async () => {
    const vault = await client.loan.getVault(adamLiquidatedVaultId)
    expect(vault).toStrictEqual({
      vaultId: adamLiquidatedVaultId,
      loanSchemeId: 'default',
      ownerAddress: expect.any(String),
      state: LoanVaultState.IN_LIQUIDATION,
      batchCount: 1,
      liquidationHeight: 162,
      liquidationPenalty: 5,
      batches: [
        {
          index: 0,
          collaterals: [
            {
              amount: '10000.00000000',
              displaySymbol: 'DFI',
              id: '0',
              name: 'Default Defi token',
              symbol: 'DFI',
              symbolKey: 'DFI'
            }
          ],
          loan: {
            amount: '30.00005130',
            displaySymbol: 'dAAPL',
            id: '2',
            name: '',
            symbol: 'AAPL',
            symbolKey: 'AAPL'
          }
        }
      ]
    })
  })

  it('should fail due to getting non-existent vault', async () => {
    expect.assertions(4)
    try {
      await client.loan.getVault('0530ab29a9f09416a014a4219f186f1d5d530e9a270a9f941275b3972b43ebb7')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find vault',
        url: '/v0.0/regtest/loans/vaults/0530ab29a9f09416a014a4219f186f1d5d530e9a270a9f941275b3972b43ebb7'
      })
    }

    try {
      await client.loan.getVault('999')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find vault',
        url: '/v0.0/regtest/loans/vaults/999'
      })
    }
  })

  it('should fail due to id is malformed', async () => {
    expect.assertions(2)
    try {
      await client.loan.getVault('$*@')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        at: expect.any(Number),
        code: 400,
        message: "RpcApiError: 'vaultId must be of length 64 (not 3, for '$*@')', code: -8, method: getvault",
        type: 'BadRequest',
        url: '/v0.0/regtest/loans/vaults/$*@'
      })
    }
  })
})
