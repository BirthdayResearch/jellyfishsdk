import { BigNumber } from '@defichain/jellyfish-api-core'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RawTransaction } from 'packages/jellyfish-api-core/src/category/rawtx'
import { PaybackLoanParser } from '../../../../src/controller/AddressParser/dftx/paybackLoan'
import { AddressParserTest } from '../../../../test/AddressParserTest'

describe('PaybackLoanParser', () => {
  const container = new MasterNodeRegTestContainer()
  let apiClient!: JsonRpcClient

  let loanTaker!: string
  let rawTx!: RawTransaction
  let oracleId!: string

  async function createAndMintToken (
    client: JsonRpcClient,
    name: string,
    amount: number
  ): Promise<void> {
    await client.token.createToken({
      symbol: name,
      name,
      mintable: true,
      isDAT: true,
      tradeable: true,
      collateralAddress: loanTaker
    })
    await container.generate(1)
    await client.token.mintTokens(`${amount}@${name}`)
    await container.generate(1)
  }

  beforeAll(async () => {
    await container.start()
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(10000, 5000)
    loanTaker = await container.getNewAddress()

    // Address is funded at this point.
    // convert 10000 DFI UTXO -> DFI Token
    await apiClient.account.utxosToAccount({ [loanTaker]: '10000@DFI' })
    await container.generate(1)

    // Mint wrapped tokens
    await createAndMintToken(apiClient, 'BTC', 20000)

    // Setup oracle
    const oracleAddr = await container.getNewAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' }
    ]
    oracleId = await apiClient.oracle.appointOracle(
      oracleAddr,
      priceFeeds,
      { weightage: 1 }
    )
    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await apiClient.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '500@BTC', currency: 'USD' },
          { tokenAmount: '2@TSLA', currency: 'USD' },
          { tokenAmount: '1@DUSD', currency: 'USD' }
        ]
      }
    )
    await container.generate(1)

    // Setup collateral
    await apiClient.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await container.generate(1)

    await apiClient.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await container.generate(1)

    // setLoanToken
    await apiClient.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await container.generate(1)

    await apiClient.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await container.generate(1)

    // Setup loan
    await apiClient.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await container.generate(1)

    const vaultAddr = await container.getNewAddress()
    const vault = await apiClient.loan.createVault({
      ownerAddress: vaultAddr,
      loanSchemeId: 'scheme'
    })
    await container.generate(1)

    await apiClient.loan.depositToVault({
      vaultId: vault,
      from: loanTaker,
      amount: '5000@DFI'
    })
    await container.generate(1)

    await apiClient.loan.depositToVault({
      vaultId: vault,
      from: loanTaker,
      amount: '1@BTC'
    })
    await container.generate(1)

    await apiClient.loan.takeLoan({
      vaultId: vault,
      to: loanTaker,
      amounts: ['500@TSLA', '500@DUSD']
    })
    await container.generate(1)

    // Create pools for the assets
    // Although using loantaker as the liquidity provider
    // doesn't make sense in real life scenario
    // TODO(chen): Improve tests
    const shareAddress = await container.getNewAddress()

    await apiClient.poolpair.createPoolPair({
      tokenA: 'TSLA',
      tokenB: 'DUSD',
      commission: 0,
      status: true,
      ownerAddress: loanTaker
    })
    await container.generate(1)

    await apiClient.poolpair.addPoolLiquidity({
      [loanTaker]: ['400@TSLA', '100@DUSD']
    }, shareAddress)
    await container.generate(1)

    await apiClient.poolpair.createPoolPair({
      tokenA: 'DUSD',
      tokenB: 'DFI',
      commission: 0,
      status: true,
      ownerAddress: loanTaker
    })
    await container.generate(1)

    await apiClient.poolpair.addPoolLiquidity({
      [loanTaker]: ['100@DUSD', '200@DFI']
    }, shareAddress)
    await container.generate(1)

    // Payback
    const txn = await apiClient.loan.paybackLoan({
      vaultId: vault,
      from: loanTaker,
      amounts: ['10@TSLA']
    })

    // test subject
    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should extract all addresses involved in paybackLoan tx', async () => {
    const parser = AddressParserTest(apiClient, [new PaybackLoanParser('regtest')])
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toStrictEqual(1)
    expect(addresses).toContain(loanTaker)
  })
})
