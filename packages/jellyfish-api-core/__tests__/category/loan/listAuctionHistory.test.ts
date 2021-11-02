import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('Loan listAuctionHistory', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  let aliceColAddr: string
  let bobVaultId1: string
  let bobVaultId2: string
  let bobColAddr1: string
  let bobColAddr2: string

  async function setup (): Promise<void> {
    aliceColAddr = await alice.generateAddress()
    await alice.token.dfi({
      address: aliceColAddr,
      amount: 60000
    })
    await alice.generate(1)

    await alice.token.create({
      symbol: 'BTC',
      collateralAddress: aliceColAddr
    })
    await alice.generate(1)

    await alice.token.mint({
      symbol: 'BTC',
      amount: 30000
    })
    await alice.generate(1)

    // oracle setup
    const priceFeeds = [
      {
        token: 'DFI',
        currency: 'USD'
      },
      {
        token: 'BTC',
        currency: 'USD'
      },
      {
        token: 'TSLA',
        currency: 'USD'
      },
      {
        token: 'MSFT',
        currency: 'USD'
      },
      {
        token: 'A',
        currency: 'USD'
      },
      {
        token: 'B',
        currency: 'USD'
      },
      {
        token: 'C',
        currency: 'USD'
      },
      {
        token: 'D',
        currency: 'USD'
      },
      {
        token: 'E',
        currency: 'USD'
      }
    ]
    const oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
    await alice.generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '5@DFI',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '10000@BTC',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@TSLA',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@MSFT',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@A',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@B',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@C',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@D',
        currency: 'USD'
      }]
    })
    await alice.generate(1)
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2@E',
        currency: 'USD'
      }]
    })
    await alice.generate(1)

    // collateral token
    await alice.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await alice.generate(1)

    // loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await alice.generate(1)

    await alice.token.mint({
      symbol: 'TSLA',
      amount: 40000
    })
    await alice.generate(1)

    // loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'MSFT',
      fixedIntervalPriceId: 'MSFT/USD'
    })
    await alice.generate(1)

    await alice.token.mint({
      symbol: 'MSFT',
      amount: 40000
    })
    await alice.generate(1)

    // loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'A',
      fixedIntervalPriceId: 'A/USD'
    })
    await alice.generate(1)

    await alice.token.mint({
      symbol: 'A',
      amount: 40000
    })
    await alice.generate(1)

    // loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'B',
      fixedIntervalPriceId: 'B/USD'
    })
    await alice.generate(1)

    await alice.token.mint({
      symbol: 'B',
      amount: 40000
    })
    await alice.generate(1)

    // loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'C',
      fixedIntervalPriceId: 'C/USD'
    })
    await alice.generate(1)

    await alice.token.mint({
      symbol: 'C',
      amount: 40000
    })
    await alice.generate(1)

    // loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'D',
      fixedIntervalPriceId: 'D/USD'
    })
    await alice.generate(1)

    await alice.token.mint({
      symbol: 'D',
      amount: 40000
    })
    await alice.generate(1)

    // loan token
    await alice.rpc.loan.setLoanToken({
      symbol: 'E',
      fixedIntervalPriceId: 'E/USD'
    })
    await alice.generate(1)

    await alice.token.mint({
      symbol: 'E',
      amount: 40000
    })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['10000@TSLA'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['10000@A'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['10000@B'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['10000@C'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['10000@D'] })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['10000@E'] })
    await alice.generate(1)
    // loan scheme set up
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    bobColAddr1 = await bob.generateAddress()
    await bob.token.dfi({
      address: bobColAddr1,
      amount: 40000
    })
    await bob.generate(1)

    bobColAddr2 = await bob.generateAddress()
    await bob.token.dfi({
      address: bobColAddr2,
      amount: 20000
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['10000@MSFT'] })
    await alice.generate(1)

    await alice.rpc.account.accountToAccount(aliceColAddr, { [bobColAddr1]: '1@BTC' })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr1]: ['10000@TSLA'] })
    await alice.generate(1)

    await alice.rpc.account.accountToAccount(aliceColAddr, { [bobColAddr2]: '1@BTC' })
    await alice.generate(1)

    await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr2]: ['10000@TSLA'] })
    await alice.generate(1)

    await tGroup.waitForSync()

    // Bob's first vault
    const bobVaultAddr1 = await bob.generateAddress()
    bobVaultId1 = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr1,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    await bob.rpc.loan.depositToVault({
      vaultId: bobVaultId1,
      from: bobColAddr1,
      amount: '22000@DFI'
    })
    await bob.generate(1)

    await bob.rpc.loan.depositToVault({
      vaultId: bobVaultId1,
      from: bobColAddr1,
      amount: '1@BTC'
    })
    await bob.generate(1)

    const bobLoanAddr = await bob.generateAddress()
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId1,
      amounts: '4500@TSLA',
      to: bobLoanAddr
    })
    await bob.generate(1)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId1,
      amounts: '942@MSFT',
      to: bobLoanAddr
    })
    await bob.generate(1)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId1,
      amounts: '942@A',
      to: bobLoanAddr
    })
    await bob.generate(1)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId1,
      amounts: '942@B',
      to: bobLoanAddr
    })
    await bob.generate(1)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId1,
      amounts: '942@C',
      to: bobLoanAddr
    })
    await bob.generate(1)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId1,
      amounts: '942@D',
      to: bobLoanAddr
    })
    await bob.generate(1)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId1,
      amounts: '50000@E',
      to: bobLoanAddr
    })
    await bob.generate(1)

    // Bob's second vault
    const bobVaultAddr2 = await bob.generateAddress()
    bobVaultId2 = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr2,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    await bob.rpc.loan.depositToVault({
      vaultId: bobVaultId2,
      from: bobColAddr2,
      amount: '10000@DFI'
    })
    await bob.generate(1)

    await bob.rpc.loan.depositToVault({
      vaultId: bobVaultId2,
      from: bobColAddr2,
      amount: '1@BTC'
    })
    await bob.generate(1)

    // increase TSLA price
    await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
      prices: [{
        tokenAmount: '2.8@TSLA',
        currency: 'USD'
      }]
    })
    await alice.generate(12)
    await tGroup.waitForSync()
  }

  beforeEach(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  describe('auctionBid success', () => {
    it('should auctionBid', async () => {
      const data = await alice.container.call('getvault', [bobVaultId1])
      console.log(JSON.stringify(data))

      {
        const account = await alice.rpc.account.getAccount(aliceColAddr)
        console.log(account)
      }

      {
        const txid = await alice.container.call('placeauctionbid', [bobVaultId1, 16, aliceColAddr, '4455.00806505@E'])
        expect(typeof txid).toStrictEqual('string')
        expect(txid.length).toStrictEqual(64)
        await alice.generate(1)
        await tGroup.waitForSync()
      }

      await bob.container.generate(40)

      {
        const account = await alice.rpc.account.getAccount(aliceColAddr)
        console.log(account)
      }

      {
        const auctionhistory = await alice.container.call('listauctionhistory')
        console.log(auctionhistory)
      }
    })
  })
})
