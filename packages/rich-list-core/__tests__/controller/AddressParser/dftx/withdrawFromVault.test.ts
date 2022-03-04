import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { BigNumber } from '@defichain/jellyfish-api-core'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { AddressParser } from '../../../../src/controller/AddressParser'

describe('WithdrawFromVaultParser', () => {
  const container = new MasterNodeRegTestContainer()
  let apiClient!: JsonRpcClient

  let sender!: string
  let receiver!: string
  let rawTx!: RawTransaction

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
      collateralAddress: sender
    })
    await container.generate(1)
    await client.token.mintTokens(`${amount}@${name}`)
    await container.generate(1)
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(10000, 5000)
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())
    sender = await container.getNewAddress()
    receiver = await container.getNewAddress()

    // Address is funded at this point.
    // convert 100 DFI UTXO -> DFI Token
    await apiClient.account.utxosToAccount({ [sender]: '10000@DFI' })
    await container.generate(1)

    // Setup oracle
    const oracleAddr = await container.getNewAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' }
    ]
    const oracleId = await apiClient.oracle.appointOracle(
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
          { tokenAmount: '500@BTC', currency: 'USD' }
        ]
      }
    )
    await container.generate(1)

    // Mint wrapped tokens
    await createAndMintToken(apiClient, 'BTC', 20000)

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

    // Setup loan
    await apiClient.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await container.generate(1)

    const vault = await apiClient.loan.createVault({
      ownerAddress: await container.getNewAddress(),
      loanSchemeId: 'scheme'
    })
    await container.generate(1)

    await apiClient.loan.depositToVault({
      vaultId: vault,
      from: sender,
      amount: '5000@DFI'
    })
    await container.generate(1)

    const txn = await apiClient.loan.withdrawFromVault({
      vaultId: vault,
      to: receiver,
      amount: '100@DFI'
    })
    // test subject
    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should extract all addresses involved in withdrawFromVault tx', async () => {
    const parser = new AddressParser(apiClient, 'regtest')
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toBeGreaterThanOrEqual(1)
    expect(addresses).toContain(receiver)
  })
})
