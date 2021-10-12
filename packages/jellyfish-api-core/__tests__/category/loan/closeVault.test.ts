import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('Loan', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultId1: string
  let vaultId2: string
  let liqVaultId: string

  let vaultAddress2: string

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    const collateralAddress = await tGroup.get(0).container.getNewAddress()
    await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 30000 })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.create({ symbol: 'BTC', collateralAddress })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.mint({ symbol: 'BTC', amount: 20000 })
    await tGroup.get(0).generate(1)

    // oracle setup
    const addr = await tGroup.get(0).generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    const oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await tGroup.get(0).generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    // collateral token
    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await tGroup.get(0).generate(1)

    // loan token
    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await tGroup.get(0).generate(1)

    // loan scheme set up
    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await tGroup.get(0).generate(1)

    const vaultAddress1 = await tGroup.get(0).generateAddress()
    vaultId1 = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddress1,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    vaultAddress2 = await tGroup.get(0).generateAddress()
    vaultId2 = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddress2,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    // set up liquidated vault here
    liqVaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: liqVaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: liqVaultId,
      amounts: '100@TSLA'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '100000@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(12)
    await tGroup.waitForSync()
  }

  it('should closeVault', async () => {
    const txId = await tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultId1, to: await tGroup.get(0).generateAddress() })
    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
  })

  it('should closeVault as vault does not exist', async () => {
    const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: '0'.repeat(64), to: await tGroup.get(0).generateAddress() })
    await expect(promise).rejects.toThrow(`RpcApiError: 'Vault <${'0'.repeat(64)}> does not found', code: -5, method: closevault`)
  })

  it('should not closeVault for liquidated vault', async () => {
    const liqVault = await tGroup.get(0).container.call('getvault', [liqVaultId])
    expect(liqVault.isUnderLiquidation).toStrictEqual(true)

    const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: liqVaultId, to: await tGroup.get(0).generateAddress() })
    await expect(promise).rejects.toThrow('RpcApiError: \'Vault is under liquidation.\', code: -26, method: closevault')
  })

  // it('should not closeVault as different auth address', async () => {
  //   const promise = tGroup.get(1).rpc.loan.closeVault({ vaultId: vaultId1, to: vaultAddress2 })
  //   await expect(promise).rejects.toThrow(`RpcApiError: 'Incorrect authorization for ${vaultAddress2}', code: -5, method: closevault`)
  // })
  //
  // it('should closeVault with utxos', async () => {
  //   const address = await tGroup.get(0).generateAddress()
  //   const utxo = await tGroup.get(0).container.fundAddress(address, 250)
  //   const txId = await tGroup.get(0).rpc.loan.closeVault({vaultId: vaultId2, to: address}, [utxo])
  //   expect(typeof txId).toStrictEqual('string')
  //   expect(txId.length).toStrictEqual(64)
  //   const rawtx = await tGroup.get(0).container.call('getrawtransaction', [txId, true])
  //   expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
  //   expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  // })

  it('should not closeVault with arbitrary utxos', async () => {
    const utxo = await tGroup.get(0).container.fundAddress(await tGroup.get(0).generateAddress(), 10)
    const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultId2, to: await tGroup.get(0).generateAddress() }, [utxo])
    await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
  })
})
