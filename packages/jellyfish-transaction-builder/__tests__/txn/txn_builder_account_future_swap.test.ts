import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RegTestFoundationKeys, RegTest } from '@defichain/jellyfish-network'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction, TxOut } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import { CTransactionSegWit, Script, SetFutureSwap, TransactionSegWit } from '@defichain/jellyfish-transaction'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { DfTxType, FutureSwap } from '@defichain/jellyfish-api-core/dist/category/account'
import { P2WPKH } from '@defichain/jellyfish-address'
import { SmartBuffer } from 'smart-buffer'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)
let collateralAddress: string
let oracleId: string
let idDUSD: string
let idTSLA: string
const attributeKey = 'ATTRIBUTES'
const futInterval = 25
const futRewardPercentage = 0.05
const contractAddress = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpsqgljc'
const dusdContractAddr = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqz7nafu8'

let provider: MockProviders
let builder: P2WPKHTransactionBuilder
let script: Script

async function fundForFeesIfUTXONotAvailable (amount = 10): Promise<void> {
  const prevouts = await provider.prevout.all()
  if (prevouts.length === 0) {
    // Fund 10 DFI UTXO to provider.getAddress() for fees
    await fundEllipticPair(testing.container, provider.ellipticPair, amount)
    await provider.setupMocks()
  }
}

async function setup (): Promise<void> {
  collateralAddress = await testing.generateAddress()
  await testing.token.dfi({ address: collateralAddress, amount: 300000 })
  await testing.token.create({ symbol: 'BTC', collateralAddress })
  await testing.generate(1)
  await testing.token.mint({ symbol: 'BTC', amount: 20000 })
  await testing.generate(1)

  // loan scheme
  await testing.container.call('createloanscheme', [100, 1, 'default'])
  await testing.generate(1)

  // price oracle
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'DUSD', currency: 'USD' }
  ]

  const addr = await testing.generateAddress()
  oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
  await testing.generate(1)

  const timestamp = Math.floor(new Date().getTime() / 1000)
  await testing.rpc.oracle.setOracleData(
    oracleId,
    timestamp,
    {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '10000@BTC', currency: 'USD' },
        { tokenAmount: '2@TSLA', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' }
      ]
    }
  )
  await testing.generate(1)

  // collateral tokens
  await testing.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(0.5),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await testing.generate(1)

  // loan token
  await testing.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setLoanToken({
    symbol: 'DUSD',
    fixedIntervalPriceId: 'DUSD/USD'
  })
  await testing.generate(1)

  idTSLA = await testing.token.getTokenId('TSLA')
  idDUSD = await testing.token.getTokenId('DUSD')

  // create a vault and take loans
  const vaultAddr = await testing.generateAddress()
  const vaultId = await testing.rpc.loan.createVault({
    ownerAddress: vaultAddr,
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.depositToVault({
    vaultId: vaultId, from: collateralAddress, amount: '100000@DFI'
  })

  // wait till the price valid.
  await testing.container.waitForPriceValid('TSLA/USD')

  // take multiple loans
  await testing.rpc.loan.takeLoan({
    vaultId: vaultId,
    to: collateralAddress,
    amounts: ['300@TSLA', '500@DUSD']
  })
  await testing.generate(1)

  // Futures setup
  // set the dfip2203/active to false
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })
  await testing.generate(1)

  // set dfip2203 params
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/reward_pct': futRewardPercentage.toString(), 'v0/params/dfip2203/block_period': futInterval.toString() } })
  await testing.generate(1)

  // set the dfip2203/active to true
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'true' } })
  await testing.generate(1)

  // Retrieve and verify gov vars
  const attributes = await testing.rpc.masternode.getGov(attributeKey)
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('true')
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/reward_pct']).toStrictEqual(futRewardPercentage.toString())
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/block_period']).toStrictEqual(futInterval.toString())
}

async function checkTxouts (outs: TxOut[]): Promise<void> {
  expect(outs[0].value).toStrictEqual(0)
  expect(outs[1].value).toBeLessThan(10)
  expect(outs[1].value).toBeGreaterThan(9.999)
  expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await provider.getAddress())

  // Ensure you don't send all your balance away
  const prevouts = await provider.prevout.all()
  expect(prevouts.length).toStrictEqual(1)
  expect(prevouts[0].value.toNumber()).toBeLessThan(10)
  expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)
}

// send transaction without minting a single block in the process
async function sendTransactionWithoutBlockMint (transaction: TransactionSegWit): Promise<void> {
  const buffer = new SmartBuffer()
  new CTransactionSegWit(transaction).toBuffer(buffer)
  const hex = buffer.toBuffer().toString('hex')
  await testing.container.call('sendrawtransaction', [hex])
}

describe('create futureswap', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    provider = await getProviders(testing.container)
    provider.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey))
    builder = new P2WPKHTransactionBuilder(provider.fee, provider.prevout, provider.elliptic, RegTest)
    await setup()

    await fundForFeesIfUTXONotAvailable(10)
    script = await provider.elliptic.script()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should create dtoken to dusd futureswap', async () => {
    const swapAmount = 1
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
      destination: 0,
      withdraw: false
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    await checkTxouts(outs)

    // check the future is in effect
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${swapAmount.toFixed(8)}@TSLA`)
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([])
      }
    }

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // move to next settle block
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    let mintedDUSD: BigNumber
    // check future settled
    {
      // calculate minted DUSD. dtoken goes for a discount.
      mintedDUSD = new BigNumber((1 - futRewardPercentage) * 2 * swapAmount).dp(8, BigNumber.ROUND_FLOOR) // (1 - reward percentage) * TSLADUSD value * TSLA swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore.plus(mintedDUSD))

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])

    // check results can be retrieved via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_EXECUTION })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapExecution', amounts: [`${mintedDUSD.toFixed(8)}@DUSD`] }))
  })

  it('should create multiple dtoken to dusd futureswap', async () => {
    const swapAmount = 1
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    {
      // move to next settle block so that we have enough duration
      const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())
    }

    {
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
        destination: 0,
        withdraw: false
      }, script)

      // Ensure the created txn is correct
      const outs = await sendTransaction(testing.container, txn)
      await checkTxouts(outs)
    }

    // check the futureswap is in effect
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${swapAmount.toFixed(8)}@TSLA`)
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([])
      }
    }

    {
      // create the futureswap again
      await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
      await testing.generate(1)
      await fundForFeesIfUTXONotAvailable(10)

      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
        destination: 0,
        withdraw: false
      }, script)

      // Ensure the created txn is correct
      const outs = await sendTransaction(testing.container, txn)
      await checkTxouts(outs)
    }

    // check the futures, second futureswap should also be there
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(2)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${swapAmount.toFixed(8)}@TSLA`)
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')
      expect(pendingFutures[1].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[1].source).toStrictEqual(`${swapAmount.toFixed(8)}@TSLA`)
      expect(pendingFutures[1].destination).toStrictEqual('DUSD')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount * 2).toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount * 2).toFixed(8)}@TSLA`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([])
      }
    }

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // move to next settle block
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    let mintedDUSD: BigNumber
    // check future settled
    {
      // calculate minted DUSD. dtoken goes for a discount.
      mintedDUSD = new BigNumber((1 - futRewardPercentage) * 2 * swapAmount * 2).dp(8, BigNumber.ROUND_FLOOR) // (1 - reward percentage) * TSLADUSD value * TSLA swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore.plus(mintedDUSD))

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount * 2).toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([`${(swapAmount * 2).toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount * 2).toFixed(8)}@TSLA`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([`${(swapAmount * 2).toFixed(8)}@TSLA`])

    // check results can be retrieved via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_EXECUTION })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapExecution', amounts: [`${mintedDUSD.div(2).toFixed(8)}@DUSD`] }))
    expect(accountHistories[1]).toStrictEqual(expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapExecution', amounts: [`${mintedDUSD.div(2).toFixed(8)}@DUSD`] }))
  })

  it('should create multiple dtoken to dusd futureswaps within the same block', async () => {
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '13@DUSD' })
    await testing.generate(1)

    {
      // move to next settle block
      const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
      await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())
    }

    // NOTE(sp): fund 3 utxos to be used for fees (to send 3 times. This is because once sent, the remaining funds of that utxo will only be available after a block generation)
    {
      await fundEllipticPair(testing.container, provider.ellipticPair, 10)
      await fundEllipticPair(testing.container, provider.ellipticPair, 10)
      await fundEllipticPair(testing.container, provider.ellipticPair, 10)
    }

    const fsStartBlock = await testing.rpc.blockchain.getBlockCount()
    {
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(0.4) },
        destination: 0,
        withdraw: false
      }, script)

      // send tx
      await sendTransactionWithoutBlockMint(txn)
    }
    {
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(0.6) },
        destination: 0,
        withdraw: false
      }, script)

      // send tx
      await sendTransactionWithoutBlockMint(txn)
    }
    {
      // await testing.container.call('sendtoaddress', [tslaAddress, 10])
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idDUSD), amount: new BigNumber(13) },
        destination: Number(idTSLA),
        withdraw: false
      }, script)

      // send tx
      await sendTransactionWithoutBlockMint(txn)
    }

    // check no blocks generated so far
    expect(fsStartBlock).toStrictEqual(await testing.rpc.blockchain.getBlockCount())

    // generate the block now
    await testing.generate(1)

    // check the futureswap is in effect
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(3)

      expect(pendingFutures).toStrictEqual(expect.arrayContaining([
        { owner: tslaAddress, source: `${(0.4).toFixed(8)}@TSLA`, destination: 'DUSD' },
        { owner: tslaAddress, source: `${(0.6).toFixed(8)}@TSLA`, destination: 'DUSD' },
        { owner: tslaAddress, source: `${(13).toFixed(8)}@DUSD`, destination: 'TSLA' }
      ]))

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(0.6 + 0.4).toFixed(8)}@TSLA`, `${(13).toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(0.6 + 0.4).toFixed(8)}@TSLA`, `${(13).toFixed(8)}@DUSD`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([])
      }
    }

    // get minted DUSD, TSLA
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
    const tslaMintedBefore = (await testing.rpc.token.getToken(idTSLA))[idTSLA].minted

    // move to next settle block
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    let mintedDUSD: BigNumber
    let mintedTSLA: BigNumber
    // check future settled
    {
      // calculate minted DUSD. dtoken goes for a discount.
      mintedDUSD = new BigNumber((1 - futRewardPercentage) * 2 * (0.4 + 0.6)).dp(8, BigNumber.ROUND_FLOOR) // (1 - reward percentage) * TSLADUSD value * TSLA swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore.plus(mintedDUSD))

      // calculate minted TSLA. dtoken goes for a premium.
      mintedTSLA = new BigNumber((1 / (1 + futRewardPercentage)) * (1 / 2) * 13).dp(8, BigNumber.ROUND_FLOOR) // (1/(1 + reward percentage)) * (DUSDTSLA) value * DUSD swap amount;
      const tslaMintedAfter = (await testing.rpc.token.getToken(idTSLA))[idTSLA].minted
      expect(tslaMintedAfter).toStrictEqual(tslaMintedBefore.plus(mintedTSLA))

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(0.4 + 0.6).toFixed(8)}@TSLA`, `${(13).toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([`${(0.4 + 0.6).toFixed(8)}@TSLA`, `${(13).toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([`${mintedTSLA.toFixed(8)}@TSLA`, `${mintedDUSD.toFixed(8)}@DUSD`])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(0.4 + 0.6).toFixed(8)}@TSLA`, `${(13).toFixed(8)}@DUSD`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${mintedTSLA.toFixed(8)}@TSLA`, `${mintedDUSD.toFixed(8)}@DUSD`])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([`${(0.4 + 0.6).toFixed(8)}@TSLA`, `${(13).toFixed(8)}@DUSD`])

    // check results can be retrieved via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_EXECUTION })
    expect(accountHistories.length).toStrictEqual(3)
    expect(accountHistories).toStrictEqual(expect.arrayContaining([
      expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapExecution', amounts: [`${mintedDUSD.multipliedBy(0.4).toFixed(8)}@DUSD`] }),
      expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapExecution', amounts: [`${mintedDUSD.multipliedBy(0.6).toFixed(8)}@DUSD`] }),
      expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapExecution', amounts: [`${mintedTSLA.toFixed(8)}@TSLA`] })
    ]))
  })

  it('should create dtoken to dusd futureswap on the next settle block', async () => {
    const swapAmount = 1
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)
    await fundForFeesIfUTXONotAvailable(10)

    // move to next settle block - 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
      destination: 0,
      withdraw: false
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    await checkTxouts(outs)

    let mintedDUSD: BigNumber
    // check future settled
    {
      // calculate minted DUSD. dtoken goes for a discount.
      mintedDUSD = new BigNumber((1 - futRewardPercentage) * 2 * swapAmount).dp(8, BigNumber.ROUND_FLOOR) // (1 - reward percentage) * TSLADUSD value * TSLA swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore.plus(mintedDUSD))

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])

    // check results can be retrieved via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_EXECUTION })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapExecution', amounts: [`${mintedDUSD.toFixed(8)}@DUSD`] }))
  })

  it('should DFI-to-DUSD future swaps', async () => {
    // set dfi to dusd govs
    const startBlock = 10 + await testing.container.getBlockCount()

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/dfip2206f/reward_pct': '0.05',
        'v0/params/dfip2206f/block_period': `${futInterval}`,
        'v0/params/dfip2206f/start_block': `${startBlock}`
      }
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/dfip2206f/active': 'true'
      }
    })
    await testing.generate(startBlock - await testing.container.getBlockCount())

    const swapAmount = 1
    const dfiAddr = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [dfiAddr]: `${swapAmount}@DFI` })
    await testing.generate(1)

    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: 0, amount: new BigNumber(swapAmount) },
      destination: Number(idDUSD),
      withdraw: false
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    await checkTxouts(outs)

    // check the future is in effect
    {
      const pendingFutures = await testing.container.call('listpendingdusdswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(dfiAddr)
      expect(pendingFutures[0].amount).toStrictEqual(1)

      const { ATTRIBUTES: attrs } = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attrs['v0/live/economy/dfip2206f_current']).toStrictEqual(['1.00000000@DFI']) // 1
      expect(attrs['v0/live/economy/dfip2206f_burned']).toStrictEqual([])
      expect(attrs['v0/live/economy/dfip2206f_minted']).toStrictEqual([])

      // dfip2206f_current burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2206f).toStrictEqual([])

      {
        // check dfiAddr
        const balance = await testing.rpc.account.getAccount(dfiAddr)
        expect(balance).toStrictEqual([])
      }

      {
        // check dusdContractAddr
        const balance = await testing.rpc.account.getAccount(dusdContractAddr)
        expect(balance).toStrictEqual(['1.00000000@DFI'])
      }
    }

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // move to next settle block
    const h = await testing.container.getBlockCount()
    await testing.generate(futInterval - ((h - startBlock) % futInterval))

    let mintedDUSD: BigNumber
    // check future settled
    {
      // calculate minted DUSD. dtoken goes for a discount.
      mintedDUSD = new BigNumber((1 - futRewardPercentage) * 1 * swapAmount).dp(8, BigNumber.ROUND_FLOOR) // (1 - reward percentage) * DFI-DUSD value * DFI swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore.plus(mintedDUSD))

      const pendingFutures = await testing.container.call('listpendingdusdswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      const { ATTRIBUTES: attrs } = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attrs['v0/live/economy/dfip2206f_current']).toStrictEqual([`${swapAmount.toFixed(8)}@DFI`])
      expect(attrs['v0/live/economy/dfip2206f_burned']).toStrictEqual([`${swapAmount.toFixed(8)}@DFI`])
      expect(attrs['v0/live/economy/dfip2206f_minted']).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])

      {
        // check dusdContractAddr
        const balance = await testing.rpc.account.getAccount(dusdContractAddr)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@DFI`])
      }

      {
        // check dfiAddr
        const balance = await testing.rpc.account.getAccount(dfiAddr)
        expect(balance).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2206f).toStrictEqual([`${swapAmount.toFixed(8)}@DFI`])

    // check results can be retrieved via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_EXECUTION })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: dfiAddr, type: 'FutureSwapExecution', amounts: [`${mintedDUSD.toFixed(8)}@DUSD`] }))
  })

  it('should consider new oracle active price, if changed before futureswap execution', async () => {
    const swapAmount = 1
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    const blockHeight = await testing.rpc.blockchain.getBlockCount()
    let nextSettleBlock = await testing.container.call('getfutureswapblock', [])

    // move to next settle block for better duration for the oracle price to kick in
    await testing.generate(nextSettleBlock - blockHeight)
    nextSettleBlock = await testing.container.call('getfutureswapblock', [])

    // create futureswap
    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
      destination: 0,
      withdraw: false
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    await checkTxouts(outs)

    // change the oracle price
    const timestamp = Math.floor(new Date().getTime() / 1000)
    const nextTSLAPrice = 2.2
    await testing.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: `${nextTSLAPrice}@TSLA`, currency: 'USD' }
        ]
      }
    )
    await testing.generate(1)
    await testing.container.waitForActivePrice('TSLA/USD', `${nextTSLAPrice}`)

    const blockHeightAfter = await testing.rpc.blockchain.getBlockCount()

    // check next settle block is not reached yet
    expect(blockHeightAfter).toBeLessThan(nextSettleBlock)

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // move to nextSettleBlock
    await testing.generate(nextSettleBlock - blockHeightAfter)

    let mintedDUSD: BigNumber
    // check future settled
    {
      // calculate minted DUSD. dtoken goes for a discount.
      mintedDUSD = new BigNumber((1 - futRewardPercentage) * nextTSLAPrice * swapAmount).dp(8, BigNumber.ROUND_FLOOR) // (1 - reward percentage) * nextTSLAPrice * TSLA swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore.plus(mintedDUSD))

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])

    // check results can be retrieved via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_EXECUTION })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapExecution', amounts: [`${mintedDUSD.toFixed(8)}@DUSD`] }))
  })

  it('should refund if the oracle price is invalid at futureswap execution block', async () => {
    const swapAmount = 1
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    const blockHeight = await testing.rpc.blockchain.getBlockCount()
    let nextSettleBlock = await testing.container.call('getfutureswapblock', [])

    // move to next settle block
    await testing.generate(nextSettleBlock - blockHeight)
    nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const nextPriceBlock = await testing.container.getImmediatePriceBlockBeforeBlock('TSLA/USD', nextSettleBlock)

    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
      destination: 0,
      withdraw: false
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    await checkTxouts(outs)

    // check the futureswap is in effect
    const pendingFutures = await testing.container.call('listpendingfutureswaps')
    expect(pendingFutures.length).toStrictEqual(1)

    // move to nextPriceBlock - 1
    await testing.generate(nextPriceBlock - 1 - await testing.rpc.blockchain.getBlockCount())

    // change the oracle price
    const timestamp = Math.floor(new Date().getTime() / 1000)
    const nextTSLAPrice = 3
    await testing.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: `${nextTSLAPrice}@TSLA`, currency: 'USD' }
        ]
      }
    )
    await testing.generate(1)
    {
      // now check the price invalid
      const priceDataInvalid = await testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
      expect(priceDataInvalid.isLive).toBeFalsy()
    }

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // move to nextSettleBlock
    await testing.generate(nextSettleBlock - nextPriceBlock)

    // check price is still invalid
    {
      const priceDataInvalid = await testing.rpc.oracle.getFixedIntervalPrice('TSLA/USD')
      expect(priceDataInvalid.isLive).toBeFalsy()
    }

    // check futureswap is not executed.
    {
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore)

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([])

    // check results can be retrieved via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_REFUND })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: contractAddress, type: 'FutureSwapRefund', amounts: [`-${swapAmount.toFixed(8)}@TSLA`] }))
    expect(accountHistories[1]).toStrictEqual(expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapRefund', amounts: [`${swapAmount.toFixed(8)}@TSLA`] }))
  })

  it('should create dusd to dtoken futureswap', async () => {
    const swapAmount = 1
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@DUSD` })
    await testing.generate(1)

    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: Number(idDUSD), amount: new BigNumber(swapAmount) },
      destination: Number(idTSLA),
      withdraw: false
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    await checkTxouts(outs)

    // check the future is in effect
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${swapAmount.toFixed(8)}@DUSD`)
      expect(pendingFutures[0].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${swapAmount.toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@DUSD`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([])
      }
    }

    // get minted TSLA
    const tslaMintedBefore = (await testing.rpc.token.getToken(idTSLA))[idTSLA].minted

    // move to next settle block
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    let mintedTSLA: BigNumber
    // check future settled
    {
      // calculate minted TSLA. dtoken goes for a premium.
      mintedTSLA = new BigNumber((1 / (1 + futRewardPercentage)) * (1 / 2) * swapAmount).dp(8, BigNumber.ROUND_FLOOR) // (1/(1 + reward percentage)) * (DUSDTSLA) value * DUSD swap amount;
      const tslaMintedAfter = (await testing.rpc.token.getToken(idTSLA))[idTSLA].minted
      expect(tslaMintedAfter).toStrictEqual(tslaMintedBefore.plus(mintedTSLA))

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${swapAmount.toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([`${swapAmount.toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([`${mintedTSLA.toFixed(8)}@TSLA`])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@DUSD`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${mintedTSLA.toFixed(8)}@TSLA`])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([`${swapAmount.toFixed(8)}@DUSD`])

    // check results can be retrieved via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_EXECUTION })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapExecution', amounts: [`${mintedTSLA.toFixed(8)}@TSLA`] }))
  })

  it('should not create futureswap when DFIP2203 is not active', async () => {
    const swapAmount = 1
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    // deactivate DFIP2203
    await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)
    const attributes = await testing.rpc.masternode.getGov(attributeKey)
    expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('false')

    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
      destination: 0,
      withdraw: false
    }, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: DFIP2203 not currently active\', code: -26')
  })

  it('should refund the futureswap if DFIP2203 is disabled before execution', async () => {
    const swapAmount = 1
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    // create the futureswap
    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
      destination: 0,
      withdraw: false
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    await checkTxouts(outs)

    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])

    // check the futureswap is in effect
    const pendingFutures = await testing.container.call('listpendingfutureswaps')
    expect(pendingFutures.length).toStrictEqual(1)

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // deactivate DFIP2203
    await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })
    await testing.generate(1)
    const attributes = await testing.rpc.masternode.getGov(attributeKey)
    expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('false')

    // move to nextSettleBlock
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    // check futureswap is not executed.
    {
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore)

      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2203).toStrictEqual([])

    // check results can be retrieved via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_REFUND })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: contractAddress, type: 'FutureSwapRefund', amounts: [`-${swapAmount.toFixed(8)}@TSLA`] }))
    expect(accountHistories[1]).toStrictEqual(expect.objectContaining({ owner: tslaAddress, type: 'FutureSwapRefund', amounts: [`${swapAmount.toFixed(8)}@TSLA`] }))
  })

  it('should not create futureswap when invalid inputs given', async () => {
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: '1@TSLA' })
    await testing.generate(1)

    {
      // zero source amount is given
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(0) },
        destination: 0,
        withdraw: false
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Source amount must be more than zero\', code: -26')
    }
    {
      // negative source amount is given
      await fundForFeesIfUTXONotAvailable(10)
      const futureSwap: SetFutureSwap = {
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(-1) },
        destination: 0,
        withdraw: false
      }

      await expect(builder.account.futureSwap(futureSwap, script)).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -1000000')
    }
    {
      // less than 1 sat source amount is given
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(0.000000001) },
        destination: 0,
        withdraw: false
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Source amount must be more than zero\', code: -26')
    }
    {
      // invalid source dtoken 100
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(100), amount: new BigNumber(1) },
        destination: 0,
        withdraw: false
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Could not get source loan token 100\', code: -26')
    }
    {
      // non loan source token 1(BTC)
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(1), amount: new BigNumber(1) },
        destination: 0,
        withdraw: false
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Could not get source loan token 1\', code: -26')
    }
    {
      // destination is given when futureswap dtoken to dusd
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(1) },
        destination: 1,
        withdraw: false
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Destination should not be set when source amount is dToken or DFI\', code: -26')
    }
    {
      // INVALID destination 100 is given when futureswap dusd to dtoken
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idDUSD), amount: new BigNumber(1) },
        destination: 100,
        withdraw: false
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Could not get destination loan token 100. Set valid destination.\', code: -26')
    }
    {
      // arbitrary address without enough balance
      await fundForFeesIfUTXONotAvailable(10)
      const arbAddress = await testing.generateAddress()
      const txn = await builder.account.futureSwap({
        owner: P2WPKH.fromAddress(RegTest, arbAddress, P2WPKH).getScript(),
        source: { token: Number(idTSLA), amount: new BigNumber(1) },
        destination: 0,
        withdraw: false
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Transaction must have at least one input from owner\', code: -26')
    }
  })

  it('should not create futureswap when DFIP2203 is disabled for the dtoken', async () => {
    const swapAmount = 1
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    // deactivate DFIP2203 for dtoken
    const key = `v0/token/${idTSLA}/dfip2203`

    await testing.rpc.masternode.setGov({ [attributeKey]: { [key]: 'false' } })
    await testing.generate(1)
    const attributes = await testing.rpc.masternode.getGov(attributeKey)
    expect(attributes.ATTRIBUTES[key]).toStrictEqual('false')

    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
      destination: 0,
      withdraw: false
    }, script)

    // Ensure the created txn is correct
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: DFIP2203 currently disabled for token 2\', code: -26')
  })

  it('should not create DFI-to-DUSD futureswap while dfip2206f is not active', async () => {
    const swapAmount = 1
    const dfiAddr = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [dfiAddr]: `${swapAmount}@DFI` })
    await testing.generate(1)

    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: 0, amount: new BigNumber(swapAmount) },
      destination: Number(idDUSD),
      withdraw: false
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: DFIP2206F not currently active\', code: -26')
  })
})

describe('withdraw futureswap', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    provider = await getProviders(testing.container)
    provider.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey))
    builder = new P2WPKHTransactionBuilder(provider.fee, provider.prevout, provider.elliptic, RegTest)
    await setup()

    await fundForFeesIfUTXONotAvailable(10)
    script = await provider.elliptic.script()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should withdraw futureswap dtoken to dusd', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    // create futureswap
    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount}@TSLA`
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // withdraw half from the futureswap
    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: Number(idTSLA), amount: new BigNumber(swapAmount / 2) },
      destination: 0,
      withdraw: true
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    await checkTxouts(outs)

    // check the future swap after withdrawing a half
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${(swapAmount - swapAmount / 2).toFixed(8)}@TSLA`)
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount - swapAmount / 2).toFixed(8)}@TSLA`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount - swapAmount / 2).toFixed(8)}@TSLA`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${(swapAmount / 2).toFixed(8)}@TSLA`])
      }
    }
    // withdraw second half of the future swap
    {
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(swapAmount / 2) },
        destination: 0,
        withdraw: true
      }, script)

      // Ensure the created txn is correct
      const outs = await sendTransaction(testing.container, txn)
      await checkTxouts(outs)
    }

    // check the future after withdrawing all
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }
      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)

    // move to next settle block
    await testing.generate(nextSettleBlock - currentBlock)

    // verify that no future swap happened
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])
      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }
      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }
    }
  })

  it('should withdraw futureswap dusd to dtoken', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@DUSD` })
    await testing.generate(1)

    // create futureswap
    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    const oneSatoshi = 0.00000001
    const withdrawAmount = swapAmount - oneSatoshi

    // withdraw a part of the future swap
    {
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idDUSD), amount: new BigNumber(withdrawAmount) },
        destination: Number(idTSLA),
        withdraw: true
      }, script)

      // Ensure the created txn is correct
      const outs = await sendTransaction(testing.container, txn)
      await checkTxouts(outs)
    }

    // check the future swap after withdrawing first part
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${(swapAmount - withdrawAmount).toFixed(8)}@DUSD`)
      expect(pendingFutures[0].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DUSD`])
      }
      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${withdrawAmount.toFixed(8)}@DUSD`])
      }
    }

    // withdraw second part of the future swap
    {
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idDUSD), amount: new BigNumber(oneSatoshi) },
        destination: Number(idTSLA),
        withdraw: true
      }, script)

      // Ensure the created txn is correct
      const outs = await sendTransaction(testing.container, txn)
      await checkTxouts(outs)
    }

    // check the future after withdrawing all
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toBeUndefined()
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toBeUndefined()

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }
      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${(withdrawAmount + oneSatoshi).toFixed(8)}@DUSD`])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)

    // move to next settle block
    await testing.generate(nextSettleBlock - currentBlock)

    // verify that no future swap happened
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }
      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${(withdrawAmount + oneSatoshi).toFixed(8)}@DUSD`])
      }
    }
  })

  it('should withdraw futureswap at the settle block', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@TSLA`
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)
    await fundForFeesIfUTXONotAvailable(10)

    // move to next settle block - 1
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount() - 1)

    // withdraw at the settle block
    {
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
        destination: 0,
        withdraw: true
      }, script)

      // Ensure the created txn is correct
      const outs = await sendTransaction(testing.container, txn)
      await checkTxouts(outs)
    }

    // check the future swap after settle block
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${swapAmount.toFixed(8)}@TSLA`])
      }
    }
  })

  it('should DFI-to-DUSD withdraw future swaps', async () => {
    // set dfi to dusd govs
    const startBlock = 10 + await testing.container.getBlockCount()

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/dfip2206f/reward_pct': '0.05',
        'v0/params/dfip2206f/block_period': `${futInterval}`,
        'v0/params/dfip2206f/start_block': `${startBlock}`
      }
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/dfip2206f/active': 'true'
      }
    })
    await testing.generate(startBlock - await testing.container.getBlockCount())

    const swapAmount = 10
    const withdrawAmount = 7
    const dfiAddr = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [dfiAddr]: `${swapAmount}@DFI` })
    await testing.generate(1)

    await testing.rpc.account.futureSwap({
      address: dfiAddr,
      amount: `${swapAmount.toFixed(8)}@DFI`,
      destination: 'DUSD'
    })
    await testing.generate(1)

    await fundForFeesIfUTXONotAvailable(10)
    const txn = await builder.account.futureSwap({
      owner: await provider.elliptic.script(),
      source: { token: 0, amount: new BigNumber(withdrawAmount) },
      destination: Number(idDUSD),
      withdraw: true
    }, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    await checkTxouts(outs)

    // check the future is in effect
    {
      const pendingFutures = await testing.container.call('listpendingdusdswaps')
      expect(pendingFutures.length).toStrictEqual(1)
      expect(pendingFutures[0].owner).toStrictEqual(dfiAddr)
      expect(pendingFutures[0].amount).toStrictEqual(3)

      const { ATTRIBUTES: attrs } = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attrs['v0/live/economy/dfip2206f_current']).toStrictEqual(['3.00000000@DFI'])
      expect(attrs['v0/live/economy/dfip2206f_burned']).toStrictEqual([])
      expect(attrs['v0/live/economy/dfip2206f_minted']).toStrictEqual([])

      // dfip2206f_current burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2206f).toStrictEqual([])

      {
        // check dfiAddr
        const balance = await testing.rpc.account.getAccount(dfiAddr)
        expect(balance).toStrictEqual([`${withdrawAmount.toFixed(8)}@DFI`])
      }

      {
        // check dusdContractAddr
        const balance = await testing.rpc.account.getAccount(dusdContractAddr)
        expect(balance).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DFI`])
      }
    }

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted

    // move to next settle block
    const h = await testing.container.getBlockCount()
    await testing.generate(futInterval - ((h - startBlock) % futInterval))

    let mintedDUSD: BigNumber
    // check future settled
    {
      // calculate minted DUSD. dtoken goes for a discount.
      mintedDUSD = new BigNumber((1 - futRewardPercentage) * 1 * (swapAmount - withdrawAmount)).dp(8) // (1 - reward percentage) * DFI-DUSD value * DFI swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(idDUSD))[idDUSD].minted
      expect(dusdMintedAfter).toStrictEqual(dusdMintedBefore.plus(mintedDUSD))

      const pendingFutures = await testing.container.call('listpendingdusdswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      const { ATTRIBUTES: attrs } = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attrs['v0/live/economy/dfip2206f_current']).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DFI`])
      expect(attrs['v0/live/economy/dfip2206f_burned']).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DFI`])
      expect(attrs['v0/live/economy/dfip2206f_minted']).toStrictEqual([`${mintedDUSD.toFixed(8)}@DUSD`])

      {
        // check dusdContractAddr
        const balance = await testing.rpc.account.getAccount(dusdContractAddr)
        expect(balance).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DFI`])
      }

      {
        // check dfiAddr
        const balance = await testing.rpc.account.getAccount(dfiAddr)
        expect(balance).toStrictEqual([
          `${withdrawAmount.toFixed(8)}@DFI`,
          `${mintedDUSD.toFixed(8)}@DUSD`]
        )
      }
    }

    // check burn
    const burnAfter = await testing.rpc.account.getBurnInfo()
    expect(burnAfter.dfip2206f).toStrictEqual([`${(swapAmount - withdrawAmount).toFixed(8)}@DFI`
    ])

    // check results can be retrieved via account history
    const accountHistories = await testing.rpc.account.listAccountHistory('all', { txtype: DfTxType.FUTURE_SWAP_EXECUTION })
    expect(accountHistories[0]).toStrictEqual(expect.objectContaining({ owner: dfiAddr, type: 'FutureSwapExecution', amounts: [`${mintedDUSD.toFixed(8)}@DUSD`] }))
  })

  it('should withdraw futureswap from multiple futureswaps dtoken to dusd', async () => {
    const swapAmount = 1
    const swapAmount2 = 10
    let nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount * 2}@TSLA` })
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount2}@DUSD` })
    await testing.generate(1)

    // move to next settle block
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())
    nextSettleBlock = await testing.container.call('getfutureswapblock', [])

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@TSLA`
    }
    const fswap2: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount2}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)
    await testing.rpc.account.futureSwap(fswap2)
    await testing.generate(1)

    const withdrawAmount = swapAmount * 1.5

    // withdraw from first 2 future swaps and fswap2 should not be affected
    {
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(withdrawAmount) },
        destination: 0,
        withdraw: true
      }, script)

      // Ensure the created txn is correct
      const outs = await sendTransaction(testing.container, txn)
      await checkTxouts(outs)
    }

    // check the future swaps after withdrawing
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(2)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${(swapAmount * 2 - withdrawAmount).toFixed(8)}@TSLA`)
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')
      expect(pendingFutures[1].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[1].source).toStrictEqual(`${swapAmount2.toFixed(8)}@DUSD`)
      expect(pendingFutures[1].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount * 2 - withdrawAmount).toFixed(8)}@TSLA`, `${swapAmount2.toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount * 2 - withdrawAmount).toFixed(8)}@TSLA`, `${swapAmount2.toFixed(8)}@DUSD`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${withdrawAmount.toFixed(8)}@TSLA`])
      }
    }

    const oneSatoshi = 0.00000001

    // withdraw 1 satoshi and fswap2 should not be affected
    {
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(oneSatoshi) },
        destination: 0,
        withdraw: true
      }, script)

      // Ensure the created txn is correct
      const outs = await sendTransaction(testing.container, txn)
      await checkTxouts(outs)
    }

    // check the future swaps after withdrawing 1 satoshi
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(2)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${(swapAmount * 2 - withdrawAmount - oneSatoshi).toFixed(8)}@TSLA`)
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')
      expect(pendingFutures[1].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[1].source).toStrictEqual(`${swapAmount2.toFixed(8)}@DUSD`)
      expect(pendingFutures[1].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount * 2 - withdrawAmount - oneSatoshi).toFixed(8)}@TSLA`, `${swapAmount2.toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount * 2 - withdrawAmount - oneSatoshi).toFixed(8)}@TSLA`, `${swapAmount2.toFixed(8)}@DUSD`])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${(withdrawAmount + oneSatoshi).toFixed(8)}@TSLA`])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('should create multiple withdraw futureswaps within the same block', async () => {
    const swapAmount = 1
    const swapAmount2 = 10
    let nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount * 2}@TSLA` })
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount2}@DUSD` })
    await testing.generate(1)

    // move to next settle block
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())
    nextSettleBlock = await testing.container.call('getfutureswapblock', [])

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@TSLA`
    }
    const fswap2: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount2}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)
    await testing.rpc.account.futureSwap(fswap2)
    await testing.generate(1)

    const withdrawAmount1 = swapAmount * 1.5
    const withdrawAmount2 = swapAmount * 0.2

    // NOTE(sp): fund 2 utxos to be used for fees (to send 2 times. This is because once sent, the remaining funds of that utxo will only be available after a block generation)
    {
      await fundEllipticPair(testing.container, provider.ellipticPair, 10)
      await fundEllipticPair(testing.container, provider.ellipticPair, 10)
      await fundEllipticPair(testing.container, provider.ellipticPair, 10)
    }

    const fsStartBlock = await testing.rpc.blockchain.getBlockCount()
    {
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(withdrawAmount1) },
        destination: 0,
        withdraw: true
      }, script)

      // send tx
      await sendTransactionWithoutBlockMint(txn)
    }
    {
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(withdrawAmount2) },
        destination: 0,
        withdraw: true
      }, script)

      // send tx
      await sendTransactionWithoutBlockMint(txn)
    }

    // check no blocks generated so far
    expect(fsStartBlock).toStrictEqual(await testing.rpc.blockchain.getBlockCount())

    // generate the block now
    await testing.generate(1)

    // check the futureswap is in effect
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(2)
      expect(pendingFutures[0].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[0].source).toStrictEqual(`${(swapAmount * 2 - withdrawAmount1 - withdrawAmount2).toFixed(8)}@TSLA`)
      expect(pendingFutures[0].destination).toStrictEqual('DUSD')
      expect(pendingFutures[1].owner).toStrictEqual(tslaAddress)
      expect(pendingFutures[1].source).toStrictEqual(`${swapAmount2.toFixed(8)}@DUSD`)
      expect(pendingFutures[1].destination).toStrictEqual('TSLA')

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([`${(swapAmount * 2 - withdrawAmount1 - withdrawAmount2).toFixed(8)}@TSLA`, `${swapAmount2.toFixed(8)}@DUSD`])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([`${(swapAmount * 2 - withdrawAmount1 - withdrawAmount2).toFixed(8)}@TSLA`, `${swapAmount2.toFixed(8)}@DUSD`])
      }
      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${(withdrawAmount1 + withdrawAmount2).toFixed(8)}@TSLA`])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('should withdraw futureswap from multiple futureswaps dusd to dtoken', async () => {
    const swapAmount = 1
    let nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount * 2}@DUSD` })
    await testing.generate(1)

    // move to next settle block
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())
    nextSettleBlock = await testing.container.call('getfutureswapblock', [])

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // withdraw
    {
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idDUSD), amount: new BigNumber(swapAmount * 0.8) },
        destination: Number(idTSLA),
        withdraw: true
      }, script)

      // Ensure the created txn is correct
      const outs = await sendTransaction(testing.container, txn)
      await checkTxouts(outs)
    }
    {
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idDUSD), amount: new BigNumber(swapAmount * 1.2) },
        destination: Number(idTSLA),
        withdraw: true
      }, script)

      // Ensure the created txn is correct
      const outs = await sendTransaction(testing.container, txn)
      await checkTxouts(outs)
    }

    // check the future swap after withdrawing all
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_burned']).toStrictEqual([])
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_minted']).toStrictEqual([])

      // dfip2203 burn should be empty
      const burnBefore = await testing.rpc.account.getBurnInfo()
      expect(burnBefore.dfip2203).toStrictEqual([])

      {
        // check contractAddress
        const balance = await testing.rpc.account.getAccount(contractAddress)
        expect(balance).toStrictEqual([])
      }

      {
        // check tslaAddress
        const balance = await testing.rpc.account.getAccount(tslaAddress)
        expect(balance).toStrictEqual([`${(swapAmount * 2).toFixed(8)}@DUSD`])
      }
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('should not withdraw futureswap invalid futureswap dtoken to dusd', async () => {
    const swapAmount = 1
    let nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    // move to next settle block
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())
    nextSettleBlock = await testing.container.call('getfutureswapblock', [])

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@TSLA`
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    await fundForFeesIfUTXONotAvailable(10)

    // withdraw more than the future swap amount
    {
      const withdrawAmount = swapAmount + 0.00000001
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(withdrawAmount) },
        destination: 0,
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: amount 1.00000000 is less than 1.00000001\', code: -26')
    }

    // Withdraw fail - Destination should not be set when source amount is dToken or DFI
    {
      const withdrawAmount = 0.5
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(withdrawAmount) },
        destination: Number(idDUSD),
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Destination should not be set when source amount is dToken or DFI\', code: -26')
    }

    // Withdraw fail - try to withdraw from unavailable futureswap
    {
      const withdrawAmount = 0.5
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idDUSD), amount: new BigNumber(withdrawAmount) },
        destination: Number(idTSLA),
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: amount 0.00000000 is less than 0.50000000\', code: -26')
    }

    // Withdraw fail - Invalid source token: 10
    {
      const withdrawAmount = 0.5
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(10), amount: new BigNumber(withdrawAmount) },
        destination: 0,
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Could not get source loan token 10\', code: -26')
    }

    // withdraw with BTC(1) which is not a loan token
    {
      const withdrawAmount = 0.5
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(1), amount: new BigNumber(withdrawAmount) },
        destination: 0,
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Could not get source loan token 1\', code: -26')
    }

    // withdraw from arbitrary address
    {
      const withdrawAddress = 'bcrt1qcnfukr6c78wlz2tqpv8vxe0zu339c06pmm3l30'
      const txn = await builder.account.futureSwap({
        owner: P2WPKH.fromAddress(RegTest, withdrawAddress, P2WPKH).getScript(),
        source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
        destination: 0,
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Transaction must have at least one input from owner\', code: -26')
    }

    // withdraw from arbitrary valid address
    {
      const withdrawAddress = await testing.generateAddress()
      const txn = await builder.account.futureSwap({
        owner: P2WPKH.fromAddress(RegTest, withdrawAddress, P2WPKH).getScript(),
        source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
        destination: 0,
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Transaction must have at least one input from owner\', code: -26')
    }

    // withdraw 0 amount
    {
      const withdrawAmount = 0
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(withdrawAmount) },
        destination: 0,
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Source amount must be more than zero\', code: -26')
    }

    // withdraw -1 amount
    {
      const withdrawAmount = -1
      const futureSwap: SetFutureSwap = {
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(withdrawAmount) },
        destination: 0,
        withdraw: true
      }

      await expect(builder.account.futureSwap(futureSwap, script)).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -1000000')
    }

    // withdraw 0.1 satoshi
    {
      const withdrawAmount = 0.000000001
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(withdrawAmount) },
        destination: 0,
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: Source amount must be more than zero\', code: -26')
    }

    // withdraw after setting ${idTSLA}/dfip2203 to false
    {
      const idTSLA = await testing.token.getTokenId('TSLA')
      await testing.rpc.masternode.setGov({ [attributeKey]: { [`v0/token/${idTSLA}/dfip2203`]: 'false' } })

      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
        destination: 0,
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: DFIP2203 currently disabled for token 2\', code: -26')

      await testing.rpc.masternode.setGov({ [attributeKey]: { [`v0/token/${idTSLA}/dfip2203`]: 'true' } })
    }

    // withdraw after setting the dfip2203/active to false
    {
      await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })

      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idTSLA), amount: new BigNumber(swapAmount) },
        destination: 0,
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: DFIP2203 not currently active\', code: -26')
      await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'true' } })
    }

    // verify that all happened before settle block
    const currentBlock = await testing.rpc.blockchain.getBlockCount()
    expect(currentBlock).toBeLessThan(nextSettleBlock)
  })

  it('should not withdraw futureswap after the settled', async () => {
    const swapAmount = 1
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    const tslaAddress = await provider.getAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@DUSD` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount.toFixed(8)}@DUSD`,
      destination: 'TSLA'
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

    // move to next settle block
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    // check the future swap after the settle block
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)
    }

    // withdraw after settle block
    {
      await fundForFeesIfUTXONotAvailable(10)
      const txn = await builder.account.futureSwap({
        owner: await provider.elliptic.script(),
        source: { token: Number(idDUSD), amount: new BigNumber(swapAmount) },
        destination: Number(idTSLA),
        withdraw: true
      }, script)

      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'DFIP2203Tx: amount 0.00000000 is less than 1.00000000\', code: -26')
    }
  })
})
