import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Account', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    // await testing.container.waitForWalletBalanceGTE(100)
    // const metadata = {
    //   symbol: 'DBTC',
    //   name: 'DBTC',
    //   isDAT: true,
    //   mintable: true,
    //   tradeable: true,
    //   collateralAddress: await testing.container.getNewAddress()
    // }
    // await testing.token.create(metadata)
    // await testing.container.generate(1)
    // await testing.token.mint({ amount: 200, symbol: 'DBTC' })
    // await testing.container.generate(1)

    const colAddr = await testing.generateAddress()
    const usdcAddr = await testing.generateAddress()
    const poolAddr = await testing.generateAddress()

    await testing.token.dfi({ address: colAddr, amount: 20000 })
    await testing.generate(1)

    await testing.token.create({ symbol: 'USDC', collateralAddress: colAddr })
    await testing.generate(1)

    await testing.token.mint({ symbol: 'USDC', amount: 10000 })
    await testing.generate(1)

    await testing.rpc.account.accountToAccount(colAddr, { [usdcAddr]: '10000@USDC' })
    await testing.generate(1)

    await testing.rpc.poolpair.createPoolPair({
      tokenA: 'DFI',
      tokenB: 'USDC',
      commission: 0,
      status: true,
      ownerAddress: poolAddr
    })
    await testing.generate(1)

    const poolPairsKeys = Object.keys(await testing.rpc.poolpair.listPoolPairs())
    expect(poolPairsKeys.length).toStrictEqual(1)
    const dfiUsdc = poolPairsKeys[0]

    // set LP_SPLIT, make LM gain rewards, MANDATORY
    // ensure `no_rewards` flag turned on
    // ensure do not get response without txid
    await testing.container.call('setgov', [{ LP_SPLITS: { [dfiUsdc]: 1.0 } }])
    await testing.container.generate(1)

    await testing.rpc.poolpair.addPoolLiquidity({
      [colAddr]: '5000@DFI',
      [usdcAddr]: '5000@USDC'
    }, poolAddr)
    await testing.generate(1)

    await testing.rpc.poolpair.poolSwap({
      from: colAddr,
      tokenFrom: 'DFI',
      amountFrom: 555,
      to: usdcAddr,
      tokenTo: 'USDC'
    })
    await testing.generate(1)

    await testing.rpc.poolpair.removePoolLiquidity(poolAddr, '2@DFI-USDC')
    await testing.generate(1)

    // for testing same block pagination
    await testing.token.create({ symbol: 'APE', collateralAddress: colAddr })
    await testing.generate(1)

    await testing.token.create({ symbol: 'CAT', collateralAddress: colAddr })
    await testing.token.create({ symbol: 'DOG', collateralAddress: colAddr })
    await testing.generate(1)

    await testing.token.create({ symbol: 'ELF', collateralAddress: colAddr })
    await testing.token.create({ symbol: 'FOX', collateralAddress: colAddr })
    await testing.token.create({ symbol: 'RAT', collateralAddress: colAddr })
    await testing.token.create({ symbol: 'BEE', collateralAddress: colAddr })
    await testing.token.create({ symbol: 'COW', collateralAddress: colAddr })
    await testing.token.create({ symbol: 'OWL', collateralAddress: colAddr })
    await testing.token.create({ symbol: 'ELK', collateralAddress: colAddr })
    await testing.generate(1)

    await testing.token.create({ symbol: 'PIG', collateralAddress: colAddr })
    await testing.token.create({ symbol: 'KOI', collateralAddress: colAddr })
    await testing.token.create({ symbol: 'FLY', collateralAddress: colAddr })
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it.only('should getAccountHistory with owner CScript', async () => {
    const accounts: any[] = await testing.rpc.account.listAccounts()

    const { owner } = accounts[0]
    console.log('accounts[0]: ', accounts[0])
    console.log('owner: ', owner)
    const { hex, addresses } = owner

    const testHistory = await testing.rpc.account.listAccountHistory(addresses[0])
    console.log('testHistory: ', testHistory)

    const accountHistories = await testing.rpc.account.listAccountHistory(hex)
    console.log('accountHistories: ', accountHistories)

    let referenceHistory = accountHistories[0]
    for (let i = 1; (referenceHistory.type === 'sent' || referenceHistory.type === 'receive' || referenceHistory.txn === undefined) && i < accountHistories.length; i++) {
      referenceHistory = accountHistories[i]
    }

    const history = await testing.rpc.account.getAccountHistory(hex, referenceHistory.blockHeight, referenceHistory.txn)
    console.log('history: ', history)
    expect(history.owner).toStrictEqual(referenceHistory.owner)
    expect(history.blockHeight).toStrictEqual(referenceHistory.blockHeight)
    expect(history.txn).toStrictEqual(referenceHistory.txn)
    expect(history.txid).toStrictEqual(referenceHistory.txid)
    expect(history.type).toStrictEqual(referenceHistory.type)
    expect(history.blockHash).toStrictEqual(referenceHistory.blockHash)
    expect(history.blockTime).toStrictEqual(referenceHistory.blockTime)
    expect(history.amounts).toStrictEqual(referenceHistory.amounts)
    expect(addresses.includes(history.owner)).toStrictEqual(true)
  })

  it('should getAccountHistory with owner address', async () => {
    const accountHistories = await testing.rpc.account.listAccountHistory()
    expect(accountHistories.length).toBeGreaterThan(0)

    const referenceHistory = accountHistories[0]

    const history = await testing.rpc.account.getAccountHistory(referenceHistory.owner, referenceHistory.blockHeight, referenceHistory.txn)
    expect(history.owner).toStrictEqual(referenceHistory.owner)
    expect(history.blockHeight).toStrictEqual(referenceHistory.blockHeight)
    expect(history.txn).toStrictEqual(referenceHistory.txn)
    expect(history.txid).toStrictEqual(referenceHistory.txid)
    expect(history.type).toStrictEqual(referenceHistory.type)
    expect(history.blockHash).toStrictEqual(referenceHistory.blockHash)
    expect(history.blockTime).toStrictEqual(referenceHistory.blockTime)
    expect(history.amounts).toStrictEqual(referenceHistory.amounts)
  })

  it('should not getAccountHistory when address is not valid', async () => {
    const accountHistories = await testing.rpc.account.listAccountHistory()
    expect(accountHistories.length).toBeGreaterThan(0)

    const referenceHistory = accountHistories[0]

    const history = await testing.rpc.account.getAccountHistory('mrLrCt3kMFhhfYeT8euQw5ERwyvFg9K21j', referenceHistory.blockHeight, referenceHistory.txn)
    expect(history.owner).toBeUndefined()

    const historyPromise = testing.rpc.account.getAccountHistory('mrLrCt3kMFhhfYeT8euQw5ERw', referenceHistory.blockHeight, referenceHistory.txn - 1)
    await expect(historyPromise).rejects.toThrow(RpcApiError)
    await expect(historyPromise).rejects.toThrow('does not refer to any valid address')
  })

  it('should not getAccountHistory when blockHeight is not valid', async () => {
    const accountHistories = await testing.rpc.account.listAccountHistory()
    expect(accountHistories.length).toBeGreaterThan(0)

    const referenceHistory = accountHistories[0]

    let history = await testing.rpc.account.getAccountHistory(referenceHistory.owner, referenceHistory.blockHeight - 1, referenceHistory.txn)
    expect(history.owner).toBeUndefined()

    history = await testing.rpc.account.getAccountHistory(referenceHistory.owner, -1, referenceHistory.txn)
    expect(history.owner).toBeUndefined()
  })

  it('should not getAccountHistory when txn is not valid', async () => {
    const accountHistories = await testing.rpc.account.listAccountHistory()
    expect(accountHistories.length).toBeGreaterThan(0)

    const referenceHistory = accountHistories[0]

    let history = await testing.rpc.account.getAccountHistory(referenceHistory.owner, referenceHistory.blockHeight, referenceHistory.txn - 1)
    expect(history.owner).toBeUndefined()

    history = await testing.rpc.account.getAccountHistory(referenceHistory.owner, referenceHistory.blockHeight, -1)
    expect(history.owner).toBeUndefined()
  })
})
