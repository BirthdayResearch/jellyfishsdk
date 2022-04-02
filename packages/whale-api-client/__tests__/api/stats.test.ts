import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

describe('stats', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let client: WhaleApiClient

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    client = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()

    await createToken(container, 'A')
    await mintTokens(container, 'A')
    await createToken(container, 'B')
    await mintTokens(container, 'B')

    await createPoolPair(container, 'A', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'A',
      amountA: 100,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })
    await createPoolPair(container, 'B', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'B',
      amountA: 50,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })
    await createToken(container, 'USDT')
    await createPoolPair(container, 'USDT', 'DFI')
    await mintTokens(container, 'USDT')
    await addPoolLiquidity(container, {
      tokenA: 'USDT',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 431.51288,
      shareAddress: await getNewAddress(container)
    })
    await createToken(container, 'USDC')
    await createPoolPair(container, 'USDC', 'DFI')
    await mintTokens(container, 'USDC')
    await addPoolLiquidity(container, {
      tokenA: 'USDC',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 431.51288,
      shareAddress: await getNewAddress(container)
    })
    const height = await container.getBlockCount()
    await container.generate(1)
    await service.waitForIndexedHeight(height)
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })

  it('should get stat data', async () => {
    const data = await client.stats.get()

    expect(data).toStrictEqual({
      count: {
        blocks: 122,
        prices: 0,
        tokens: 9,
        masternodes: 8
      },
      burned: {
        address: 0,
        auction: 0,
        emission: 7323.58,
        fee: 4,
        payback: 0,
        total: 7327.58
      },
      tvl: {
        dex: 5853.942343505482,
        masternodes: 185.39423435054823,
        loan: 0,
        total: 6039.336577856031
      },
      price: {
        usd: 2.317427929381853,
        usdt: 2.317427929381853
      },
      masternodes: {
        locked: [
          {
            count: 8,
            tvl: 185.39423435054823,
            weeks: 0
          }
        ]
      },
      emission: {
        total: 405.04,
        anchor: 0.081008,
        dex: 103.08268,
        community: 19.887464,
        masternode: 134.999832,
        burned: 146.989016
      },
      loan: {
        count: {
          collateralTokens: 0,
          loanTokens: 0,
          openAuctions: 0,
          openVaults: 0,
          schemes: 0
        },
        value: {
          collateral: 0,
          loan: 0
        }
      },
      blockchain: {
        difficulty: expect.any(Number)
      },
      net: {
        protocolversion: expect.any(Number),
        subversion: expect.any(String),
        version: expect.any(Number)
      }
    })
  })

  it('should get stat supply', async () => {
    const data = await client.stats.getSupply()
    expect(data).toStrictEqual({
      max: 1200000000,
      total: expect.any(Number),
      burned: expect.any(Number),
      circulating: expect.any(Number)
    })
  })

  it('should get stat burn', async () => {
    const data = await client.stats.getBurn()
    expect(data).toStrictEqual({
      address: 'mfburnZSAM7Gs1hpDeNaMotJXSGA7edosG',
      amount: 0,
      auctionburn: 0,
      dexfeetokens: [],
      dfipaybackfee: 0,
      dfipaybacktokens: [],
      emissionburn: expect.any(Number),
      feeburn: expect.any(Number),
      paybackburn: 0,
      tokens: [],
      paybackfees: [],
      paybacktokens: []
    })
  })
})

describe('loan - stats', () => {
  const container = new MasterNodeRegTestContainer()
  const service = new StubService(container)
  const client = new StubWhaleApiClient(service)
  const testing = Testing.create(container)

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

    { // DEX setup
      await testing.fixture.createPoolPair({
        a: {
          amount: 2000,
          symbol: 'DUSD'
        },
        b: {
          amount: 2000,
          symbol: 'DFI'
        }
      })
      await testing.fixture.createPoolPair({
        a: {
          amount: 1000,
          symbol: 'USDT'
        },
        b: {
          amount: 2000,
          symbol: 'DFI'
        }
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
    { // Oracle 1
      const oracleAddress = await testing.generateAddress()
      const priceFeeds = [
        {
          token: 'DFI',
          currency: 'USD'
        },
        {
          token: 'TSLA',
          currency: 'USD'
        },
        {
          token: 'AAPL',
          currency: 'USD'
        },
        {
          token: 'GOOGL',
          currency: 'USD'
        }
      ]
      oracleId = await testing.rpc.oracle.appointOracle(oracleAddress, priceFeeds, { weightage: 1 })
      await testing.generate(1)

      const timestamp = Math.floor(new Date().getTime() / 1000)
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
        prices: [{
          tokenAmount: '1@DFI',
          currency: 'USD'
        }]
      })
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
        prices: [{
          tokenAmount: '2@TSLA',
          currency: 'USD'
        }]
      })
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
        prices: [{
          tokenAmount: '2@AAPL',
          currency: 'USD'
        }]
      })
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
        prices: [{
          tokenAmount: '4@GOOGL',
          currency: 'USD'
        }]
      })
      await testing.generate(1)
    }

    { // Oracle 2
      const priceFeeds = [
        {
          token: 'DFI',
          currency: 'USD'
        },
        {
          token: 'TSLA',
          currency: 'USD'
        },
        {
          token: 'AAPL',
          currency: 'USD'
        },
        {
          token: 'GOOGL',
          currency: 'USD'
        }
      ]
      const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), priceFeeds, { weightage: 1 })
      await testing.generate(1)

      const timestamp = Math.floor(new Date().getTime() / 1000)
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
        prices: [{
          tokenAmount: '1@DFI',
          currency: 'USD'
        }]
      })
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
        prices: [{
          tokenAmount: '2@TSLA',
          currency: 'USD'
        }]
      })
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
        prices: [{
          tokenAmount: '2@AAPL',
          currency: 'USD'
        }]
      })
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, {
        prices: [{
          tokenAmount: '4@GOOGL',
          currency: 'USD'
        }]
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
      await testing.rpc.loan.createVault({
        ownerAddress: await testing.address('John'),
        loanSchemeId: 'default'
      })
      await testing.generate(1)
    }

    { // Vault Deposit Collateral (Bob)
      const bobDepositedVaultId = await testing.rpc.loan.createVault({
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
      const johnLoanedVaultId = await testing.rpc.loan.createVault({
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
      const adamLiquidatedVaultId = await testing.rpc.loan.createVault({
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
        prices: [{
          tokenAmount: '1000@AAPL',
          currency: 'USD'
        }]
      })

      // Wait for 12 blocks which are equivalent to 2 hours (1 block = 10 minutes in regtest) in order to liquidate the vault
      await testing.generate(12)
    }

    {
      const height = await container.getBlockCount()
      await service.waitForIndexedHeight(height - 1)
    }
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })

  it('should get stat data', async () => {
    const data = await client.stats.get()

    expect(data).toStrictEqual({
      count: {
        blocks: 137,
        prices: 4,
        tokens: 8,
        masternodes: 8
      },
      burned: expect.any(Object),
      tvl: {
        dex: 6000,
        loan: 20000,
        masternodes: 40,
        total: 26040
      },
      price: {
        usd: 0.5,
        usdt: 0.5
      },
      masternodes: expect.any(Object),
      emission: expect.any(Object),
      loan: {
        count: {
          collateralTokens: 1,
          loanTokens: 3,
          openAuctions: 1,
          openVaults: 4,
          schemes: 2
        },
        value: {
          collateral: 20000,
          loan: 60.00018266
        }
      },
      blockchain: {
        difficulty: expect.any(Number)
      },
      net: {
        protocolversion: expect.any(Number),
        subversion: expect.any(String),
        version: expect.any(Number)
      }
    })
  })

  it('should get stat supply', async () => {
    const data = await client.stats.getSupply()
    expect(data).toStrictEqual({
      max: 1200000000,
      total: expect.any(Number),
      burned: expect.any(Number),
      circulating: expect.any(Number)
    })
  })
})
