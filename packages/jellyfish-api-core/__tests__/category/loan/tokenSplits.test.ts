import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { VaultActive, VaultLiquidation, VaultState } from '../../../src/category/loan'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { DfTxType, FutureSwap } from '@defichain/jellyfish-api-core/dist/category/account'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)

let vaultId1: string
let vaultId2: string
let vaultId3: string
let vaultId4: string
let collateralAddress: string
let tslaID: string
let fbID: string
let dusdID: string
let oracleID: string

const attributeKey = 'ATTRIBUTES'
const futInterval = 25
const futRewardPercentage = 0.05
const contractAddress = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpsqgljc'

async function setup (): Promise<void> {
  collateralAddress = await testing.generateAddress()
  await testing.token.dfi({
    address: collateralAddress,
    amount: 300000
  })
  await testing.token.create({
    symbol: 'BTC',
    collateralAddress
  })
  await testing.generate(1)
  await testing.token.mint({
    symbol: 'BTC',
    amount: 11
  })
  await testing.generate(1)

  // Loan scheme
  await testing.container.call('createloanscheme', [100, 1, 'default'])
  await testing.generate(1)

  // Price oracle
  const addr = await testing.generateAddress()
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
      token: 'AAPL',
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
      token: 'FB',
      currency: 'USD'
    },
    {
      token: 'DUSD',
      currency: 'USD'
    }
  ]
  oracleID = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
  await testing.generate(1)

  const timestamp = Math.floor(new Date().getTime() / 1000)
  await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
    prices: [{
      tokenAmount: '1@DFI',
      currency: 'USD'
    }]
  })
  await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
    prices: [{
      tokenAmount: '10000@BTC',
      currency: 'USD'
    }]
  })
  await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
    prices: [{
      tokenAmount: '2@AAPL',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
    prices: [{
      tokenAmount: '2@TSLA',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
    prices: [{
      tokenAmount: '2@MSFT',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
    prices: [{
      tokenAmount: '2@FB',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
    prices: [{
      tokenAmount: '1@DUSD',
      currency: 'USD'
    }]
  })
  await testing.generate(1)

  // Collateral tokens
  await testing.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await testing.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await testing.generate(1)

  // Loan token
  await testing.rpc.loan.setLoanToken({
    symbol: 'AAPL',
    fixedIntervalPriceId: 'AAPL/USD'
  })
  await testing.generate(1)
  await testing.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await testing.generate(1)
  await testing.rpc.loan.setLoanToken({
    symbol: 'MSFT',
    fixedIntervalPriceId: 'MSFT/USD'
  })
  await testing.generate(1)
  await testing.rpc.loan.setLoanToken({
    symbol: 'FB',
    fixedIntervalPriceId: 'FB/USD'
  })
  await testing.generate(1)
  await testing.rpc.loan.setLoanToken({
    symbol: 'DUSD',
    fixedIntervalPriceId: 'DUSD/USD'
  })
  await testing.generate(1)

  const tslaInfo = await testing.rpc.token.getToken('TSLA')
  tslaID = Object.keys(tslaInfo)[0]

  const fbInfo = await testing.rpc.token.getToken('FB')
  fbID = Object.keys(fbInfo)[0]

  const dusdInfo = await testing.rpc.token.getToken('DUSD')
  dusdID = Object.keys(dusdInfo)[0]

  // Vault 1
  vaultId1 = await testing.rpc.container.call('createvault', [collateralAddress, 'default'])
  await testing.generate(1)

  await testing.container.call('deposittovault', [vaultId1, collateralAddress, '10000@DFI'])
  await testing.generate(1)
  await testing.container.call('deposittovault', [vaultId1, collateralAddress, '0.5@BTC'])
  await testing.generate(1)

  await testing.container.call('takeloan', [{
    vaultId: vaultId1,
    amounts: '7500@AAPL'
  }])
  await testing.generate(1)

  // Vault 2
  vaultId2 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
  await testing.generate(1)

  await testing.container.call('deposittovault', [vaultId2, collateralAddress, '20000@0DFI'])
  await testing.generate(1)
  await testing.container.call('deposittovault', [vaultId2, collateralAddress, '1@BTC'])
  await testing.generate(1)

  await testing.container.call('takeloan', [{
    vaultId: vaultId2,
    amounts: '15000@TSLA',
    to: collateralAddress
  }])
  await testing.generate(1)

  // Vault 3
  vaultId3 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
  await testing.generate(1)

  await testing.container.call('deposittovault', [vaultId3, collateralAddress, '30000@DFI'])
  await testing.generate(1)
  await testing.container.call('deposittovault', [vaultId3, collateralAddress, '1.5@BTC'])
  await testing.generate(1)

  await testing.container.call('takeloan', [{
    vaultId: vaultId3,
    amounts: '22500@MSFT'
  }])
  await testing.generate(1)

  // Vault 4
  vaultId4 = await testing.rpc.container.call('createvault', [await testing.generateAddress(), 'default'])
  await testing.generate(1)

  await testing.container.call('deposittovault', [vaultId4, collateralAddress, '40000@DFI'])
  await testing.generate(1)
  await testing.container.call('deposittovault', [vaultId4, collateralAddress, '2@BTC'])
  await testing.generate(1)

  await testing.container.call('takeloan', [{
    vaultId: vaultId4,
    amounts: '30000@FB'
  }])
  await testing.generate(1)

  {
    // If there is no liquidation, return an empty array object
    const data = await testing.rpc.loan.listAuctions()
    expect(data).toStrictEqual([])
  }

  {
    const vault1 = await testing.rpc.vault.getVault(vaultId1)
    expect(vault1.state).toStrictEqual('active')

    const vault2 = await testing.rpc.vault.getVault(vaultId2)
    expect(vault2.state).toStrictEqual('active')

    const vault3 = await testing.rpc.vault.getVault(vaultId3)
    expect(vault3.state).toStrictEqual('active')

    const vault4 = await testing.rpc.vault.getVault(vaultId4)
    expect(vault4.state).toStrictEqual('active')
  }

  // Going to liquidate the vaults by price increase of the loan tokens
  await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
    prices: [{
      tokenAmount: '2.2@AAPL',
      currency: 'USD'
    }]
  })
  await testing.generate(1)
  await testing.container.waitForActivePrice('AAPL/USD', '2.2')
  await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
    prices: [{
      tokenAmount: '2.2@TSLA',
      currency: 'USD'
    }]
  })
  await testing.container.waitForActivePrice('TSLA/USD', '2.2')

  const [auction1, auction2] = await testing.rpc.vault.listAuctions()
  {
    const vault1 = await testing.rpc.vault.getVault(auction1.vaultId)
    expect(vault1.state).toStrictEqual('inLiquidation')

    const vault2 = await testing.rpc.vault.getVault(auction2.vaultId)
    expect(vault2.state).toStrictEqual('inLiquidation')

    const vault3 = await testing.rpc.vault.getVault(vaultId3)
    expect(vault3.state).toStrictEqual('active')

    const vault4 = await testing.rpc.vault.getVault(vaultId4)
    expect(vault4.state).toStrictEqual('active')
  }

  await testing.rpc.account.sendTokensToAddress({}, { [collateralAddress]: ['252@AAPL'] })
  await testing.generate(1)

  const txid = await testing.container.call('placeauctionbid', [vaultId1, 0, collateralAddress, '5252@AAPL'])
  expect(typeof txid).toStrictEqual('string')
  expect(txid.length).toStrictEqual(64)
  await testing.generate(1)
}

async function setupFutureSwap (): Promise<void> {
  // Futures setup
  // set the dfip2203/active to false
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'false' } })
  await testing.generate(1)

  // set dfip2203 params
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/reward_pct': `${futRewardPercentage}`, 'v0/params/dfip2203/block_period': `${futInterval}` } })
  await testing.generate(1)

  // set the dfip2203/active to true
  await testing.rpc.masternode.setGov({ [attributeKey]: { 'v0/params/dfip2203/active': 'true' } })
  await testing.generate(1)

  // Retrieve and verify gov vars
  const attributes = await testing.rpc.masternode.getGov(attributeKey)
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('true')
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/reward_pct']).toStrictEqual(`${futRewardPercentage}`)
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/block_period']).toStrictEqual(`${futInterval}`)
}

async function checkTokenSplit (tokenID: string, tokenSymbol: string, tokenSuffix: string, minted: BigNumber, checkLoan: boolean, checkCollateral: boolean): Promise<string> {
  // check old token
  const oldToken = (await testing.rpc.token.getToken(tokenID))[tokenID]
  expect(oldToken.symbol).toStrictEqual(`${tokenSymbol}${tokenSuffix}`)
  expect(oldToken.minted).toStrictEqual(new BigNumber(0))
  expect(oldToken.mintable).toStrictEqual(false)
  expect(oldToken.tradeable).toStrictEqual(false)
  expect(oldToken.finalized).toStrictEqual(true)
  expect(oldToken.destructionTx).toStrictEqual(await testing.rpc.blockchain.getBestBlockHash()) // NOTE(surangap) - should it be the tx hash instead of bockhash
  expect(oldToken.destructionHeight).toStrictEqual(new BigNumber(await testing.rpc.blockchain.getBlockCount()))

  // old token in attributes
  const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
  expect(attributes.ATTRIBUTES[`v0/token/${tokenID}/fixed_interval_price_id`]).not.toBeDefined()
  if (checkCollateral) {
    expect(attributes.ATTRIBUTES[`v0/token/${tokenID}/loan_collateral_enabled`]).not.toBeDefined()
    expect(attributes.ATTRIBUTES[`v0/token/${tokenID}/loan_collateral_factor`]).not.toBeDefined()
  }
  if (checkLoan) {
    expect(attributes.ATTRIBUTES[`v0/token/${tokenID}/loan_minting_enabled`]).not.toBeDefined()
    expect(attributes.ATTRIBUTES[`v0/token/${tokenID}/loan_minting_interest`]).not.toBeDefined()
  }
  expect(attributes.ATTRIBUTES[`v0/locks/token/${tokenID}`]).not.toBeDefined()

  // const tokenIDV1 = tokenID
  tokenID = Object.keys(await testing.rpc.token.getToken(tokenSymbol))[0]
  // check new token in attributes
  expect(attributes.ATTRIBUTES[`v0/token/${tokenID}/fixed_interval_price_id`]).toStrictEqual(`${tokenSymbol}/USD`)
  if (checkCollateral) {
    expect(attributes.ATTRIBUTES[`v0/token/${tokenID}/loan_collateral_enabled`]).toStrictEqual('true')
    expect(attributes.ATTRIBUTES[`v0/token/${tokenID}/loan_collateral_factor`]).toStrictEqual('1')
  }
  if (checkLoan) {
    expect(attributes.ATTRIBUTES[`v0/token/${tokenID}/loan_minting_enabled`]).toStrictEqual('true')
    expect(attributes.ATTRIBUTES[`v0/token/${tokenID}/loan_minting_interest`]).toStrictEqual('0')
  }
  expect(attributes.ATTRIBUTES[`v0/locks/token/${tokenID}`]).toStrictEqual('true')

  // get new token by ID
  const newToken = (await testing.rpc.token.getToken(tokenID))[tokenID]
  expect(newToken.symbol).toStrictEqual(tokenSymbol)
  expect(newToken.minted).toStrictEqual(minted)
  expect(newToken.mintable).toStrictEqual(true)
  expect(newToken.tradeable).toStrictEqual(true)
  expect(newToken.finalized).toStrictEqual(false)
  const block = await testing.rpc.blockchain.getBlock(await testing.rpc.blockchain.getBestBlockHash(), 1)
  expect(newToken.creationTx).toStrictEqual(block.tx[1])
  expect(newToken.creationHeight).toStrictEqual(new BigNumber(await testing.rpc.blockchain.getBlockCount()))
  expect(newToken.destructionTx).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
  expect(newToken.destructionHeight).toStrictEqual(new BigNumber(-1))

  return tokenID // return new tokenID
}

describe('Token splits', () => {
  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should check token after split', async () => {
    const tokenTSLA = await testing.rpc.token.getToken(tslaID)
    const newMintedTSLA = tokenTSLA[tslaID].minted.multipliedBy(2)

    // set a token split at current block + 2 for TSLA and FB
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)
    await checkTokenSplit(tslaID, 'TSLA', '/v1', newMintedTSLA, true, false)
  })

  it('should check active vault after split', async () => {
    const tokenFB = await testing.rpc.token.getToken(fbID)
    const newMintedFB = tokenFB[fbID].minted.multipliedBy(2)

    const vaultFBBefore = await testing.rpc.vault.getVault(vaultId4) as VaultActive

    // set a token split at current block + 2 for FB
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${fbID}/2,`
      }
    })
    await testing.generate(2)
    const newFBID = await checkTokenSplit(fbID, 'FB', '/v1', newMintedFB, true, false)

    {
      // check vaults
      const vaultFBAfter = await testing.rpc.vault.getVault(vaultId4) as VaultActive
      console.log(JSON.stringify(vaultFBBefore))
      console.log(JSON.stringify(vaultFBAfter))
      expect(vaultFBAfter.vaultId).toStrictEqual(vaultFBBefore.vaultId)
      expect(vaultFBAfter.ownerAddress).toStrictEqual(vaultFBBefore.ownerAddress)
      expect(vaultFBAfter.state).toStrictEqual(VaultState.FROZEN)
      expect(vaultFBAfter.collateralAmounts).toStrictEqual(vaultFBBefore.collateralAmounts)
      const loanAmountBefore = Number(vaultFBBefore.loanAmounts[0].replace('@FB', ''))
      const loanAmountAfter = Number(vaultFBAfter.loanAmounts[0].replace('@FB', ''))
      expect(loanAmountAfter).toBeGreaterThan(loanAmountBefore * 2) // interest accumilation before split
      // check newFBID is still locked.
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newFBID}`]).toStrictEqual('true')

      // try to update the vault
      const promise = testing.rpc.vault.depositToVault({ vaultId: vaultId4, from: collateralAddress, amount: '10@DFI' })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('RpcApiError: \'Test DepositToVaultTx execution failed:\nFixed interval price currently disabled due to locked token\', code: -32600, method: deposittovault')
    }

    {
      // unlock the token and check
      await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newFBID}`]: 'false' } })
      await testing.generate(1)
      // check newFBID is unlocked now
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newFBID}`]).toStrictEqual('false')

      // oracle new price kicks in
      const timestamp = Math.floor(new Date().getTime() / 1000)
      await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
        prices: [{
          tokenAmount: '1@FB',
          currency: 'USD'
        }]
      })
      await testing.generate(1)

      // wait till the price valid.
      await testing.container.waitForPriceValid('FB/USD')

      const vaultFB = await testing.rpc.vault.getVault(vaultId4) as VaultActive
      expect(vaultFB.state).toStrictEqual(VaultState.ACTIVE)

      // try to update the vault
      await testing.rpc.vault.depositToVault({ vaultId: vaultId4, from: collateralAddress, amount: '10@DFI' })
      await testing.generate(1)
      const vaultFBAfterDeposit = await testing.rpc.vault.getVault(vaultId4) as VaultActive
      expect(vaultFBAfterDeposit.collateralValue).toStrictEqual(vaultFB.collateralValue.plus(10))
    }
  })

  it('should create dtoken to dusd futureswap after split', async () => {
    const tslaInfo = await testing.rpc.token.getToken('TSLA')
    tslaID = Object.keys(tslaInfo)[0]

    const tokenTSLA = await testing.rpc.token.getToken(tslaID)
    const newMintedTSLA = tokenTSLA[tslaID].minted.multipliedBy(2)

    // set a token split at current block + 2 for TSLA and FB
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)
    const newTslaID = await checkTokenSplit(tslaID, 'TSLA', '/v2', newMintedTSLA, true, false)

    await setupFutureSwap()

    const swapAmount = 1
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount}@TSLA`
    }
    await testing.rpc.account.futureSwap(fswap)
    await testing.generate(1)

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

    // unlock the token and check
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newTslaID}`]: 'false' } })
    await testing.generate(1)
    // check newTslaID is unlocked now
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES[`v0/locks/token/${newTslaID}`]).toStrictEqual('false')

    // oracle new price kicks in
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
      prices: [{
        tokenAmount: '2@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(1)

    // wait till the price valid.
    await testing.container.waitForPriceValid('TSLA/USD')

    // get minted DUSD
    const dusdMintedBefore = (await testing.rpc.token.getToken(dusdID))[dusdID].minted

    // move to next settle block
    const nextSettleBlock = await testing.container.call('getfutureswapblock', [])
    await testing.generate(nextSettleBlock - await testing.rpc.blockchain.getBlockCount())

    let mintedDUSD: BigNumber
    // check future settled
    {
      // calculate minted DUSD. dtoken goes for a discount.
      mintedDUSD = new BigNumber((1 - futRewardPercentage) * 2 * swapAmount).dp(8, BigNumber.ROUND_FLOOR) // (1 - reward percentage) * TSLADUSD value * TSLA swap amount;
      const dusdMintedAfter = (await testing.rpc.token.getToken(dusdID))[dusdID].minted
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

  it('should check liquidated vault after split', async () => {
    const tokenTSLA = await testing.rpc.token.getToken(tslaID)
    const newMintedTSLA = tokenTSLA[tslaID].minted.multipliedBy(2)

    const vaultTSLABefore = await testing.rpc.vault.getVault(vaultId2) as VaultLiquidation

    // set a token split at current block + 2 for TSLA
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)
    await checkTokenSplit(tslaID, 'TSLA', '/v1', newMintedTSLA, true, false)
    const tokenTSLAOld = (await testing.rpc.token.getToken(tslaID))[tslaID]

    {
      // check vaults
      const vaultTSLAAfter = await testing.rpc.vault.getVault(vaultId2) as VaultLiquidation
      console.log(JSON.stringify(vaultTSLABefore))
      console.log(JSON.stringify(vaultTSLAAfter))

      expect(vaultTSLAAfter.vaultId).toStrictEqual(vaultTSLABefore.vaultId)
      expect(vaultTSLAAfter.ownerAddress).toStrictEqual(vaultTSLABefore.ownerAddress)
      expect(vaultTSLAAfter.state).toStrictEqual(VaultState.IN_LIQUIDATION)
      expect(vaultTSLAAfter.batchCount).toStrictEqual(vaultTSLABefore.batchCount)

      const loanAmountBeforeBatch0 = Number(vaultTSLABefore.batches[0].loan.replace('@TSLA', ''))
      expect(vaultTSLAAfter.batches[0].loan).toStrictEqual(`${loanAmountBeforeBatch0}@${tokenTSLAOld.symbol}`)

      const loanAmountBeforeBatch1 = Number(vaultTSLABefore.batches[1].loan.replace('@TSLA', ''))
      expect(vaultTSLAAfter.batches[1].loan).toStrictEqual(`${loanAmountBeforeBatch1}@${tokenTSLAOld.symbol}`)
    }
  })

  it('should check auctions after split', async () => {
    const tokenTSLA = await testing.rpc.token.getToken(tslaID)
    const newMintedTSLA = tokenTSLA[tslaID].minted.multipliedBy(2)

    const vaultTSLABefore = await testing.rpc.vault.getVault(vaultId2) as VaultLiquidation
    const [, auctionsTSLABefore] = await testing.rpc.vault.listAuctions()

    // set a token split at current block + 2 for TSLA
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)
    const newTSLAID = await checkTokenSplit(tslaID, 'TSLA', '/v1', newMintedTSLA, true, false)
    const tokenTSLAOld = (await testing.rpc.token.getToken(tslaID))[tslaID]

    {
      // check vaults
      const vaultTSLAAfter = await testing.rpc.vault.getVault(vaultId2) as VaultLiquidation
      console.log(JSON.stringify(vaultTSLABefore))
      console.log(JSON.stringify(vaultTSLAAfter))

      expect(vaultTSLAAfter.vaultId).toStrictEqual(vaultTSLABefore.vaultId)
      expect(vaultTSLAAfter.ownerAddress).toStrictEqual(vaultTSLABefore.ownerAddress)
      expect(vaultTSLAAfter.state).toStrictEqual(VaultState.IN_LIQUIDATION)
      expect(vaultTSLAAfter.batchCount).toStrictEqual(vaultTSLABefore.batchCount)

      {
        const loanAmountBeforeBatch0 = Number(vaultTSLABefore.batches[0].loan.replace('@TSLA', ''))
        expect(vaultTSLAAfter.batches[0].loan).toStrictEqual(`${loanAmountBeforeBatch0}@${tokenTSLAOld.symbol}`)

        const loanAmountBeforeBatch1 = Number(vaultTSLABefore.batches[1].loan.replace('@TSLA', ''))
        expect(vaultTSLAAfter.batches[1].loan).toStrictEqual(`${loanAmountBeforeBatch1}@${tokenTSLAOld.symbol}`)
      }

      // check auctions
      const [, auctionsTSLAAfter] = await testing.rpc.vault.listAuctions()
      console.log(await testing.rpc.vault.listAuctions())

      console.log(JSON.stringify(auctionsTSLABefore))
      console.log(JSON.stringify(auctionsTSLAAfter))

      {
        const loanAmountBeforeBatch0 = Number(auctionsTSLABefore.batches[0].loan.replace('@TSLA', ''))
        expect(auctionsTSLAAfter.batches[0].loan).toStrictEqual(`${loanAmountBeforeBatch0}@${tokenTSLAOld.symbol}`)

        const loanAmountBeforeBatch1 = Number(auctionsTSLABefore.batches[1].loan.replace('@TSLA', ''))
        expect(auctionsTSLAAfter.batches[1].loan).toStrictEqual(`${loanAmountBeforeBatch1}@${tokenTSLAOld.symbol}`)
      }

      // unlock the token and check
      await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newTSLAID}`]: 'false' } })
      await testing.generate(1)
      // check newFBID is unlocked now
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAID}`]).toStrictEqual('false')

      // oracle new price kicks in
      const timestamp = Math.floor(new Date().getTime() / 1000)
      await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
        prices: [{
          tokenAmount: '1@TSLA',
          currency: 'USD'
        }]
      })
      await testing.generate(1)

      // wait till the price valid.
      await testing.container.waitForPriceValid('TSLA/USD')

      // check collateralAddress
      const ColAccAfter = await testing.rpc.account.getAccount(collateralAddress)
      expect(ColAccAfter).toStrictEqual(['200000.00000000@DFI', '6.00000000@BTC', '2248.00000000@AAPL', '30000.00000000@TSLA']) // Has the new TSLA token

      // try to bid to auction
      // NOTE(surangap): no address has TSLA/v1 and can not mint it further. so can not bid using TSLA/v1. Try bidding with TSLA
      const txid = await testing.rpc.vault.placeAuctionBid({
        vaultId: vaultId2,
        index: 0,
        from: collateralAddress,
        amount: '5300@TSLA'
      })
      expect(typeof txid).toStrictEqual('string')
      await testing.container.generate(1)
    }
  })
})
