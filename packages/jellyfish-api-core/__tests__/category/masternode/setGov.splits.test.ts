import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { VaultActive, VaultLiquidation, VaultState } from '../../../src/category/loan'
import { poolpair, RpcApiError } from '@defichain/jellyfish-api-core'
import { DfTxType, FutureSwap } from '@defichain/jellyfish-api-core/dist/category/account'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'

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
    amounts: '20000@FB'
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

async function checkPoolAfterSplit (ppTokenIDBefore: string, ppInfoBefore: PoolPairInfo, ppTokenSuffix: string, splitTokenSymbol: string): Promise<void> {
  // check old poolpair disabled
  const poolPairOld = await testing.poolpair.get(`${ppInfoBefore.symbol}${ppTokenSuffix}`)
  expect(poolPairOld.symbol).toStrictEqual(`${ppInfoBefore.symbol}${ppTokenSuffix}`)
  expect(poolPairOld.status).toStrictEqual(false)
  expect(poolPairOld.idTokenA).toStrictEqual(ppInfoBefore.idTokenA)
  expect(poolPairOld.idTokenB).toStrictEqual(ppInfoBefore.idTokenB)
  expect(poolPairOld.reserveA).toStrictEqual(new BigNumber(0))
  expect(poolPairOld.reserveB).toStrictEqual(new BigNumber(0))
  expect(poolPairOld.tradeEnabled).toStrictEqual(false)

  // old attributes removed
  const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
  expect(attributes.ATTRIBUTES[`v0/poolpairs/${ppTokenIDBefore}/token_a_fee_pct`]).not.toBeDefined()
  expect(attributes.ATTRIBUTES[`v0/poolpairs/${ppTokenIDBefore}/token_b_fee_pct`]).not.toBeDefined()

  const ppTokenIDNew = Object.keys(await testing.rpc.token.getToken(ppInfoBefore.symbol))[0]
  const splitTokenIDNew = Object.keys(await testing.rpc.token.getToken(splitTokenSymbol))[0]

  expect(attributes.ATTRIBUTES[`v0/poolpairs/${ppTokenIDNew}/token_a_fee_pct`]).toBeDefined()
  expect(attributes.ATTRIBUTES[`v0/poolpairs/${ppTokenIDNew}/token_b_fee_pct`]).toBeDefined()

  const poolpairNew = await testing.poolpair.get(ppTokenIDNew)
  expect(poolpairNew.symbol).toStrictEqual(ppInfoBefore.symbol)
  expect(poolpairNew.status).toStrictEqual(true)
  expect(poolpairNew.idTokenA === ppInfoBefore.idTokenA || poolpairNew.idTokenA === splitTokenIDNew).toBeTruthy()
  expect(poolpairNew.idTokenB === ppInfoBefore.idTokenB || poolpairNew.idTokenB === splitTokenIDNew).toBeTruthy()

  if (!poolpairNew.reserveA.eq(ppInfoBefore.reserveA)) {
    expect(poolpairNew.reserveA).toStrictEqual(ppInfoBefore.reserveA.multipliedBy(2))
  }
  if (!poolpairNew.reserveB.eq(ppInfoBefore.reserveB)) {
    expect(poolpairNew.reserveB).toStrictEqual(ppInfoBefore.reserveB.multipliedBy(2))
  }

  expect(poolpairNew.tradeEnabled).toStrictEqual(true)
}

async function setupPools (): Promise<void> {
  // create TSLA-DFI
  await testing.poolpair.create({
    tokenA: 'TSLA',
    tokenB: 'DFI'
  })
  await testing.generate(1)

  // add TSLA-DFI
  await testing.poolpair.add({
    a: { symbol: 'TSLA', amount: 100 },
    b: { symbol: 'DFI', amount: 200 }
  })
  await testing.generate(1)

  const ppTokenID = Object.keys(await testing.rpc.token.getToken('TSLA-DFI'))[0]

  // setup govvars
  await testing.rpc.masternode.setGov({
    ATTRIBUTES: {
      [`v0/poolpairs/${ppTokenID}/token_a_fee_pct`]: '0.01',
      [`v0/poolpairs/${ppTokenID}/token_b_fee_pct`]: '0.03'
    }
  })

  await testing.rpc.masternode.setGov({ LP_SPLITS: { [Number(ppTokenID)]: 1 } })
  await testing.rpc.masternode.setGov({ LP_LOAN_TOKEN_SPLITS: { [Number(ppTokenID)]: 1 } })
  await testing.generate(1)
}

describe('Token splits', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
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
        [`v0/oracles/splits/${splitBlock}`]: `${fbID}/2`
      }
    })
    await testing.generate(2)
    const newFBID = await checkTokenSplit(fbID, 'FB', '/v1', newMintedFB, true, false)

    {
      // check vaults
      const vaultFBAfter = await testing.rpc.vault.getVault(vaultId4) as VaultActive
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

    // oracle new price kicks in
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
      prices: [{
        tokenAmount: '1@FB',
        currency: 'USD'
      }]
    })
    await testing.generate(12) // getfixedintervalprice rpc is disabled due to locked token. generate blocks for the price to kick in

    {
      // unlock the token and check
      await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newFBID}`]: 'false' } })
      await testing.generate(1)
      // check newFBID is unlocked now
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newFBID}`]).toStrictEqual('false')

      const vaultFB = await testing.rpc.vault.getVault(vaultId4) as VaultActive
      expect(vaultFB.state).toStrictEqual(VaultState.ACTIVE)

      // try to update the vault
      await testing.rpc.vault.depositToVault({ vaultId: vaultId4, from: collateralAddress, amount: '10@DFI' })
      await testing.generate(1)
      const vaultFBAfterDeposit = await testing.rpc.vault.getVault(vaultId4) as VaultActive
      expect(vaultFBAfterDeposit.collateralValue).toStrictEqual(vaultFB.collateralValue.plus(10))
    }
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

    {
      // check vaults
      const vaultTSLAAfter = await testing.rpc.vault.getVault(vaultId2) as VaultLiquidation
      expect(vaultTSLAAfter.vaultId).toStrictEqual(vaultTSLABefore.vaultId)
      expect(vaultTSLAAfter.ownerAddress).toStrictEqual(vaultTSLABefore.ownerAddress)
      expect(vaultTSLAAfter.state).toStrictEqual(VaultState.IN_LIQUIDATION)
      expect(vaultTSLAAfter.batchCount).toStrictEqual(vaultTSLABefore.batchCount)

      const loanAmountBeforeBatch0 = Number(vaultTSLABefore.batches[0].loan.replace('@TSLA', ''))
      expect(vaultTSLAAfter.batches[0].loan).toStrictEqual(`${(loanAmountBeforeBatch0 * 2).toFixed(8)}@TSLA`)

      const loanAmountBeforeBatch1 = Number(vaultTSLABefore.batches[1].loan.replace('@TSLA', ''))
      expect(vaultTSLAAfter.batches[1].loan).toStrictEqual(`${(loanAmountBeforeBatch1 * 2).toFixed(8)}@TSLA`)
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

    {
      // check vaults
      const vaultTSLAAfter = await testing.rpc.vault.getVault(vaultId2) as VaultLiquidation
      expect(vaultTSLAAfter.vaultId).toStrictEqual(vaultTSLABefore.vaultId)
      expect(vaultTSLAAfter.ownerAddress).toStrictEqual(vaultTSLABefore.ownerAddress)
      expect(vaultTSLAAfter.state).toStrictEqual(VaultState.IN_LIQUIDATION)
      expect(vaultTSLAAfter.batchCount).toStrictEqual(vaultTSLABefore.batchCount)

      {
        const loanAmountBeforeBatch0 = Number(vaultTSLABefore.batches[0].loan.replace('@TSLA', ''))
        expect(vaultTSLAAfter.batches[0].loan).toStrictEqual(`${(loanAmountBeforeBatch0 * 2).toFixed(8)}@TSLA`)

        const loanAmountBeforeBatch1 = Number(vaultTSLABefore.batches[1].loan.replace('@TSLA', ''))
        expect(vaultTSLAAfter.batches[1].loan).toStrictEqual(`${(loanAmountBeforeBatch1 * 2).toFixed(8)}@TSLA`)
      }

      // check auctions
      const [, auctionsTSLAAfter] = await testing.rpc.vault.listAuctions()
      {
        const loanAmountBeforeBatch0 = Number(auctionsTSLABefore.batches[0].loan.replace('@TSLA', ''))
        expect(auctionsTSLAAfter.batches[0].loan).toStrictEqual(`${(loanAmountBeforeBatch0 * 2).toFixed(8)}@TSLA`)

        const loanAmountBeforeBatch1 = Number(auctionsTSLABefore.batches[1].loan.replace('@TSLA', ''))
        expect(auctionsTSLAAfter.batches[1].loan).toStrictEqual(`${(loanAmountBeforeBatch1 * 2).toFixed(8)}@TSLA`)
      }

      // oracle new price kicks in
      const timestamp = Math.floor(new Date().getTime() / 1000)
      await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
        prices: [{
          tokenAmount: '1@TSLA',
          currency: 'USD'
        }]
      })
      await testing.generate(12)

      // unlock the token and check
      await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newTSLAID}`]: 'false' } })
      await testing.generate(1)
      // check newFBID is unlocked now
      const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
      expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAID}`]).toStrictEqual('false')

      // check collateralAddress
      const ColAccAfter = await testing.rpc.account.getAccount(collateralAddress)
      expect(ColAccAfter).toStrictEqual(['200000.00000000@DFI', '6.00000000@BTC', '2248.00000000@AAPL', '30000.00000000@TSLA']) // Has the new TSLA token

      // try to bid to auction
      const txid = await testing.rpc.vault.placeAuctionBid({
        vaultId: vaultId2,
        index: 0,
        from: collateralAddress,
        amount: '10502@TSLA'
      })
      expect(typeof txid).toStrictEqual('string')
      await testing.container.generate(1)

      // check auction bid is in
      const vaultTSLAAfterBid = await testing.rpc.vault.getVault(vaultId2) as VaultLiquidation
      expect(vaultTSLAAfterBid.batchCount).toStrictEqual(4)
      expect(vaultTSLAAfterBid.batches[0].highestBid?.amount).toStrictEqual('10502.00000000@TSLA')

      const ColAccAfterBid = await testing.rpc.account.getAccount(collateralAddress)
      expect(ColAccAfterBid).toStrictEqual(['200000.00000000@DFI', '6.00000000@BTC', '2248.00000000@AAPL', '19498.00000000@TSLA']) // 30000 - 10502 = 19498

      // let it settle
      await testing.generate(36)

      // check the vault again
      const vaultTSLAAfterAuctionEnd = await testing.rpc.vault.getVault(vaultId2) as VaultActive
      expect(vaultTSLAAfterAuctionEnd.state).toStrictEqual(VaultState.ACTIVE)
    }
  })

  it('should create futureswap after split unlock', async () => {
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
    const newTslaID = await checkTokenSplit(tslaID, 'TSLA', '/v1', newMintedTSLA, true, false)

    await setupFutureSwap()

    const swapAmount = 1
    const tslaAddress = await testing.generateAddress()
    await testing.rpc.account.accountToAccount(collateralAddress, { [tslaAddress]: `${swapAmount}@TSLA` })
    await testing.generate(1)

    const fswap: FutureSwap = {
      address: tslaAddress,
      amount: `${swapAmount}@TSLA`
    }
    const promise = testing.rpc.account.futureSwap(fswap)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test DFIP2203Tx execution failed:\nCannot create future swap for locked token\', code: -32600, method: futureswap')

    // check the future is not in effect
    {
      const pendingFutures = await testing.container.call('listpendingfutureswaps')
      expect(pendingFutures.length).toStrictEqual(0)

      // check live/economy/dfip2203_*
      const attributes = await testing.rpc.masternode.getGov(attributeKey)
      expect(attributes.ATTRIBUTES['v0/live/economy/dfip2203_current']).toBeUndefined()
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
    }

    // oracle new price kicks in
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
      prices: [{
        tokenAmount: '2@TSLA',
        currency: 'USD'
      }]
    })
    await testing.generate(12)

    // unlock the token and check
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newTslaID}`]: 'false' } })
    await testing.generate(1)
    // check newTslaID is unlocked now
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES[`v0/locks/token/${newTslaID}`]).toStrictEqual('false')

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

  it('should refund existing futureswap after split', async () => {
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

    // check the future is not in effect
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
        expect(balance).toStrictEqual([`${(swapAmount * 2).toFixed(8)}@TSLA`])
      }
    }
  })

  it('should check poolswap after split', async () => {
    const tokenTSLA = await testing.rpc.token.getToken(tslaID)
    const newMintedTSLA = tokenTSLA[tslaID].minted.multipliedBy(2)

    await setupPools()
    const tokenTSLADFIBefore = await testing.rpc.token.getToken('TSLA-DFI')
    const poolPairTSLADFIBefore = await testing.poolpair.get('TSLA-DFI')

    // set a token split at current block + 2 for TSLA and FB
    const splitBlock = await testing.rpc.blockchain.getBlockCount() + 2
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        [`v0/oracles/splits/${splitBlock}`]: `${tslaID}/2`
      }
    })
    await testing.generate(2)
    const newTSLAID = await checkTokenSplit(tslaID, 'TSLA', '/v1', newMintedTSLA, true, false)
    await checkPoolAfterSplit(Object.keys(tokenTSLADFIBefore)[0], poolPairTSLADFIBefore, '/v1', 'TSLA')

    // try to use the pool
    const swapReceiveAddress = await testing.generateAddress()
    const metadata: poolpair.PoolSwapMetadata = {
      from: collateralAddress,
      tokenFrom: 'DFI',
      amountFrom: 10,
      to: swapReceiveAddress,
      tokenTo: 'TSLA'
    }

    const promise = testing.rpc.poolpair.poolSwap(metadata)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test PoolSwapTx execution failed:\nPool currently disabled due to locked token\', code: -32600, method: poolswap')

    // oracle new price kicks in
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleID, timestamp, {
      prices: [{
        tokenAmount: '1@FB',
        currency: 'USD'
      }]
    })
    await testing.generate(12)

    // unlock the token and check
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { [`v0/locks/token/${newTSLAID}`]: 'false' } })
    await testing.generate(1)
    // check newFBID is unlocked now
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES[`v0/locks/token/${newTSLAID}`]).toStrictEqual('false')

    // now try to use the pool
    const hex = await testing.rpc.poolpair.poolSwap(metadata)
    await testing.generate(1)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    expect(await testing.rpc.account.getAccount(swapReceiveAddress)).toStrictEqual(['9.15879828@TSLA'])
  })
})