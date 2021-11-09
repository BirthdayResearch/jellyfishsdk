import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('Loan', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultWithCollateralId: string // Vault with collateral token deposited

  let vaultWithoutCollateral1Id: string // Vaults without collateral token deposited
  let vaultWithoutCollateral2Id: string
  let vaultWithoutCollateral3Id: string

  let vaultWithLoanTakenId: string // Vault with loan taken
  let vaultWithPayBackLoanId: string // Vault with loan taken paid back
  let vaultWithLiquidationId: string // Vault with liquidation event triggered

  let vaultAddressWithoutCollateral2Id: string

  let oracleId: string

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
    await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 40000 })
    await tGroup.get(0).token.create({ symbol: 'DUSD', collateralAddress })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.mint({ symbol: 'DUSD', amount: 600000 })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).poolpair.create({ tokenA: 'DUSD', tokenB: 'DFI' })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).poolpair.add({
      a: { symbol: 'DUSD', amount: 25000 },
      b: { symbol: 'DFI', amount: 10000 }
    })
    await tGroup.get(0).generate(1)

    // oracle setup
    const addr = await tGroup.get(0).generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    // loan scheme setup
    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await tGroup.get(0).generate(1)

    // collateral token setup
    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await tGroup.get(0).generate(1)

    // loan token setup
    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await tGroup.get(0).generate(1)

    // Mint TSLA
    await tGroup.get(0).token.mint({ symbol: 'TSLA', amount: 30000 })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).poolpair.create({ tokenA: 'TSLA', tokenB: 'DUSD' })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).poolpair.add({
      a: { symbol: 'TSLA', amount: 20000 },
      b: { symbol: 'DUSD', amount: 10000 }
    })
    await tGroup.get(0).generate(1)

    // Vaults setup
    // vaultWithCollateralId
    vaultWithCollateralId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultWithCollateralId, from: collateralAddress, amount: '2@DFI'
    })
    await tGroup.get(0).generate(1)

    // vaultWithoutCollateral1Id
    vaultWithoutCollateral1Id = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    // vaultWithoutCollateral2Id
    vaultAddressWithoutCollateral2Id = await tGroup.get(0).generateAddress()
    vaultWithoutCollateral2Id = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddressWithoutCollateral2Id,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    // vaultWithoutCollateral3Id
    vaultWithoutCollateral3Id = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    // vaultWithLoanTakenId
    vaultWithLoanTakenId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultWithLoanTakenId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultWithLoanTakenId,
      amounts: '1@TSLA'
    })
    await tGroup.get(0).generate(1)

    // vaultWithPayBackLoanId
    const vaultWithPayBackLoanAddress = await tGroup.get(0).generateAddress()
    vaultWithPayBackLoanId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultWithPayBackLoanAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultWithPayBackLoanId, from: collateralAddress, amount: '5@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultWithPayBackLoanId,
      amounts: '1@TSLA'
    })
    await tGroup.get(0).generate(1)

    // Send TSLA to vaultWithPayBackLoanAddress so it has enough TSLA to pay back loan
    await tGroup.get(0).rpc.account.sendTokensToAddress({}, { [vaultWithPayBackLoanAddress]: ['5@TSLA'] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.container.call('paybackloan', [{ vaultId: vaultWithPayBackLoanId, from: vaultWithPayBackLoanAddress, amounts: '2@TSLA' }])
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultWithPayBackLoanId, from: collateralAddress, amount: '2@DFI'
    })
    await tGroup.get(0).generate(1)

    // vaultWithLiquidationId
    vaultWithLiquidationId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultWithLiquidationId, from: collateralAddress, amount: '300@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultWithLiquidationId,
      amounts: '100@TSLA'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  }

  it('should closeVault', async () => {
    {
      const address = await tGroup.get(0).generateAddress()
      const addressAccountBefore = await tGroup.get(0).rpc.account.getAccount(address)
      expect(addressAccountBefore).toStrictEqual([]) // 0 DFI

      const txId = await tGroup.get(0).rpc.loan.closeVault({
        vaultId: vaultWithCollateralId,
        to: address
      })
      await tGroup.get(0).generate(1)

      const addressAccountAfter = await tGroup.get(0).rpc.account.getAccount(address)
      expect(addressAccountAfter).toStrictEqual(['2.50000000@DFI']) // 2 + 0.5 DFI (Get back collateral tokens and fee)

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }

    {
      const address = await tGroup.get(0).generateAddress()
      const addressAccountBefore = await tGroup.get(0).rpc.account.getAccount(address)
      expect(addressAccountBefore).toStrictEqual([]) // 0 DFI

      const txId = await tGroup.get(0).rpc.loan.closeVault({
        vaultId: vaultWithoutCollateral1Id,
        to: address
      })
      await tGroup.get(0).generate(1)

      const addressAccountAfter = await tGroup.get(0).rpc.account.getAccount(address)
      expect(addressAccountAfter).toStrictEqual(['0.50000000@DFI']) // 0.5 DFI (Get back fee only)

      expect(typeof txId).toStrictEqual('string')
      expect(txId.length).toStrictEqual(64)
    }
  })

  it('should closeVault if loan is paid back', async () => {
    const txId = await tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultWithPayBackLoanId, to: await tGroup.get(0).generateAddress() })
    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
    await tGroup.get(0).generate(1)
  })

  it('should not closeVault as vault does not exist', async () => {
    const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: '0'.repeat(64), to: await tGroup.get(0).generateAddress() })
    await expect(promise).rejects.toThrow(`RpcApiError: 'Vault <${'0'.repeat(64)}> does not found', code: -5, method: closevault`)
  })

  it('should not closeVault for vault with loan taken', async () => {
    const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultWithLoanTakenId, to: await tGroup.get(0).generateAddress() })
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test CloseVaultTx execution failed:\nVault <${vaultWithLoanTakenId}> has loans', code: -32600, method: closevault`)
  })

  it('should not closeVault for mayliquidate vault', async () => {
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2.1@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForNextPrice('TSLA/USD', 2.1)

    const liqVault = await tGroup.get(0).container.call('getvault', [vaultWithLiquidationId])
    expect(liqVault.state).toStrictEqual('mayLiquidate')

    const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultWithLiquidationId, to: await tGroup.get(0).generateAddress() })
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test CloseVaultTx execution failed:\nVault <${vaultWithLiquidationId}> has loans', code: -32600, method: closevault`)

    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForActivePrice('TSLA/USD', 2)
  })

  it('should not closeVault for frozen vault', async () => {
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '3@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForPriceInvalid('TSLA/USD')

    const liqVault = await tGroup.get(0).container.call('getvault', [vaultWithLiquidationId])
    expect(liqVault.state).toStrictEqual('frozen')

    const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultWithLiquidationId, to: await tGroup.get(0).generateAddress() })
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test CloseVaultTx execution failed:\nVault <${vaultWithLiquidationId}> has loans', code: -32600, method: closevault`)

    await tGroup.get(0).container.waitForPriceValid('TSLA/USD')

    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForPriceInvalid('TSLA/USD')
    await tGroup.get(0).container.waitForPriceValid('TSLA/USD')
  })

  it('should not closeVault for liquidated vault', async () => {
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '3@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForPriceInvalid('TSLA/USD')
    await tGroup.get(0).container.waitForPriceValid('TSLA/USD')

    const liqVault = await tGroup.get(0).container.call('getvault', [vaultWithLiquidationId])
    expect(liqVault.state).toStrictEqual('inLiquidation')

    const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultWithLiquidationId, to: await tGroup.get(0).generateAddress() })
    await expect(promise).rejects.toThrow('RpcApiError: \'Vault is under liquidation.\', code: -26, method: closevault')

    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.waitForPriceInvalid('TSLA/USD')
    await tGroup.get(0).container.waitForPriceValid('TSLA/USD')
  })

  it('should not closeVault by anyone other than the vault owner', async () => {
    const address = await tGroup.get(1).generateAddress()
    const promise = tGroup.get(1).rpc.loan.closeVault({ vaultId: vaultWithoutCollateral2Id, to: address })
    await expect(promise).rejects.toThrow(`RpcApiError: 'Incorrect authorization for ${vaultAddressWithoutCollateral2Id}', code: -5, method: closevault`)
  })

  it('should closeVault with utxos', async () => {
    const utxo = await tGroup.get(0).container.fundAddress(vaultAddressWithoutCollateral2Id, 10)
    const txId = await tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultWithoutCollateral2Id, to: await tGroup.get(0).generateAddress() }, [utxo])
    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)
    const rawtx = await tGroup.get(0).container.call('getrawtransaction', [txId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should not closeVault with arbitrary utxos', async () => {
    const utxo = await tGroup.get(0).container.fundAddress(await tGroup.get(0).generateAddress(), 10)
    const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultWithoutCollateral3Id, to: await tGroup.get(0).generateAddress() }, [utxo])
    await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
  })
})
