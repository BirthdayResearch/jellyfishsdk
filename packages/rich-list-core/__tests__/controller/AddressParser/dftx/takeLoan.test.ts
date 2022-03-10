import { BigNumber } from '@defichain/jellyfish-api-core'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RawTransaction } from 'packages/jellyfish-api-core/src/category/rawtx'
import { TakeLoanParser } from '../../../../src/controller/AddressParser/dftx/takeLoan'
import { AddressParserTest } from '../../../../test/AddressParserTest'

describe('TakeLoanParser', () => {
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
      { token: 'GOOGL', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
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
          { tokenAmount: '4@GOOGL', currency: 'USD' }
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
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await container.generate(1)

    await apiClient.loan.setLoanToken({
      symbol: 'GOOGL',
      fixedIntervalPriceId: 'GOOGL/USD'
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

    const txn = await apiClient.loan.takeLoan({
      vaultId: vault,
      to: loanTaker,
      amounts: ['100@TSLA']
    })

    // test subject
    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should extract all addresses involved in takeLoan tx', async () => {
    const parser = AddressParserTest(apiClient, [new TakeLoanParser('regtest')])
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toStrictEqual(1)
    expect(addresses).toContain(loanTaker)
  })
})
