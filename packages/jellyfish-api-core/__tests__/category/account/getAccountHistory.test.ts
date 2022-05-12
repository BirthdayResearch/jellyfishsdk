import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Account', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.container.waitForWalletBalanceGTE(100)
    const metadata = {
      symbol: 'DBTC',
      name: 'DBTC',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: await testing.container.getNewAddress()
    }
    await testing.token.create(metadata)
    await testing.container.generate(1)
    await testing.token.mint({ amount: 200, symbol: 'DBTC' })
    await testing.container.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getAccountHistory with owner CScript', async () => {
    const accounts: any[] = await testing.rpc.account.listAccounts()

    const { owner } = accounts[0]
    const { hex, addresses } = owner

    const accountHistories = await testing.rpc.account.listAccountHistory(hex)

    const referenceHistory = accountHistories[0]

    const history = await testing.rpc.account.getAccountHistory(hex, referenceHistory.blockHeight, referenceHistory.txn)
    expect(history.owner).toStrictEqual(referenceHistory.owner)
    expect(history.blockHeight).toStrictEqual(referenceHistory.blockHeight)
    expect(history.txn).toStrictEqual(referenceHistory.txn)
    expect(history.txid).toStrictEqual(referenceHistory.txid)
    expect(history.type).toStrictEqual(referenceHistory.type)
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
