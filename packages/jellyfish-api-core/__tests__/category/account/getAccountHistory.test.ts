import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { RpcApiError } from '@defichain/jellyfish-api-core'

function createTokenForContainer (container: MasterNodeRegTestContainer) {
  return async (address: string, symbol: string, amount: number) => {
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }
}

describe('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const createToken = createTokenForContainer(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)
    await createToken(await container.getNewAddress(), 'DBTC', 200)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getAccountHistory', async () => {
    await waitForExpect(async () => {
      const accountHistories = await client.account.listAccountHistory()
      expect(accountHistories.length).toBeGreaterThan(0)
    })

    const accountHistories = await client.account.listAccountHistory()
    const referenceHistory = accountHistories[0]

    const history = await client.account.getAccountHistory(referenceHistory.owner, referenceHistory.blockHeight, referenceHistory.txn)
    expect(history.owner).toStrictEqual(referenceHistory.owner)
    expect(history.blockHeight).toStrictEqual(referenceHistory.blockHeight)
    expect(history.txn).toStrictEqual(referenceHistory.txn)
    expect(history.txid).toStrictEqual(referenceHistory.txid)
    expect(history.type).toStrictEqual(referenceHistory.type)
  })

  it('should not getAccountHistory', async () => {
    await waitForExpect(async () => {
      const accountHistories = await client.account.listAccountHistory()
      expect(accountHistories.length).toBeGreaterThan(0)
    })

    const accountHistories = await client.account.listAccountHistory()
    const referenceHistory = accountHistories[0]

    let history = await client.account.getAccountHistory(referenceHistory.owner, referenceHistory.blockHeight - 1, referenceHistory.txn)
    expect(history.owner).toBeUndefined()

    history = await client.account.getAccountHistory(referenceHistory.owner, referenceHistory.blockHeight, referenceHistory.txn - 1)
    expect(history.owner).toBeUndefined()

    history = await client.account.getAccountHistory('mrLrCt3kMFhhfYeT8euQw5ERwyvFg9K21j', referenceHistory.blockHeight, referenceHistory.txn - 1)
    expect(history.owner).toBeUndefined()

    const historyPromise = client.account.getAccountHistory('mrLrCt3kMFhhfYeT8euQw5ERw', referenceHistory.blockHeight, referenceHistory.txn - 1)
    await expect(historyPromise).rejects.toThrow(RpcApiError)
    await expect(historyPromise).rejects.toThrow('does not refer to any valid address')

    history = await client.account.getAccountHistory(referenceHistory.owner, -103, referenceHistory.txn)
    expect(history.owner).toBeUndefined()

    history = await client.account.getAccountHistory(referenceHistory.owner, referenceHistory.blockHeight, -1)
    expect(history.owner).toBeUndefined()
  })
})
