import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { DfTxType, BalanceTransferPayload } from '../../../src/category/account'

describe('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)
    await createToken(await container.getNewAddress(), 'DBTC', 200)
  })

  afterAll(async () => {
    await container.stop()
  })

  async function createToken (address: string, symbol: string, amount: number): Promise<void> {
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

  it('should listAccountHistory', async () => {
    await waitForExpect(async () => {
      const accountHistories = await client.account.listAccountHistory()
      expect(accountHistories.length).toBeGreaterThan(0)
    })

    const accountHistories = await client.account.listAccountHistory()

    for (let i = 0; i < accountHistories.length; i += 1) {
      const accountHistory = accountHistories[i]
      expect(typeof accountHistory.owner).toStrictEqual('string')
      expect(typeof accountHistory.blockHeight).toStrictEqual('number')
      expect(typeof accountHistory.blockHash).toStrictEqual('string')
      expect(typeof accountHistory.blockTime).toStrictEqual('number')
      expect(typeof accountHistory.type).toStrictEqual('string')
      expect(typeof accountHistory.txn).toStrictEqual('number')
      expect(typeof accountHistory.txid).toStrictEqual('string')
      expect(accountHistory.amounts.length).toBeGreaterThan(0)
      expect(typeof accountHistory.amounts[0]).toStrictEqual('string') // [ '10.00000000@DFI' ]
    }
  })

  it('should listAccountHistory with owner "all"', async () => {
    await waitForExpect(async () => {
      const accountHistories = await client.account.listAccountHistory('all')
      expect(accountHistories.length).toBeGreaterThan(0)
    })

    const accountHistories = await client.account.listAccountHistory('all')

    for (let i = 0; i < accountHistories.length; i += 1) {
      const accountHistory = accountHistories[i]
      expect(typeof accountHistory.owner).toStrictEqual('string')
      expect(typeof accountHistory.blockHeight).toStrictEqual('number')
      expect(typeof accountHistory.blockHash).toStrictEqual('string')
      expect(typeof accountHistory.blockTime).toStrictEqual('number')
      expect(typeof accountHistory.type).toStrictEqual('string')
      expect(typeof accountHistory.txn).toStrictEqual('number')
      expect(typeof accountHistory.txid).toStrictEqual('string')
      expect(accountHistory.amounts.length).toBeGreaterThan(0)
      expect(typeof accountHistory.amounts[0]).toStrictEqual('string')
    }
  })

  it('should listAccountHistory with owner CScript', async () => {
    const accounts: any[] = await client.account.listAccounts()

    const { owner } = accounts[0]
    const { hex, addresses } = owner

    const accountHistories = await client.account.listAccountHistory(hex)

    for (let i = 0; i < accountHistories.length; i += 1) {
      const accountHistory = accountHistories[i]
      expect(addresses.includes(accountHistory.owner)).toStrictEqual(true)
    }
  })

  it('should listAccountHistory with owner address', async () => {
    let address = ''

    await waitForExpect(async () => {
      const accountHistories = await client.account.listAccountHistory()
      expect(accountHistories.length).toBeGreaterThan(0)
      address = accountHistories[0].owner
    })

    const accountHistories = await client.account.listAccountHistory(address)
    for (let i = 0; i < accountHistories.length; i += 1) {
      const accountHistory = accountHistories[i]
      expect(accountHistory.owner).toStrictEqual(address)
    }
  })

  it('should listAccountHistory with options maxBlockHeight', async () => {
    const options = {
      maxBlockHeight: 80
    }
    await waitForExpect(async () => {
      const accountHistories = await client.account.listAccountHistory('mine', options)
      expect(accountHistories.length).toBeGreaterThan(0)
    })

    const accountHistories = await client.account.listAccountHistory('mine', options)
    for (let i = 0; i < accountHistories.length; i += 1) {
      const accountHistory = accountHistories[i]
      expect(accountHistory.blockHeight).toBeLessThanOrEqual(80)
    }
  })

  it('should listAccountHistory with options depth', async () => {
    await waitForExpect(async () => {
      const depth = 10
      const height = await container.getBlockCount()
      const accountHistories = await client.account.listAccountHistory('mine', { depth })

      for (const accountHistory of accountHistories) {
        expect(accountHistory.blockHeight).toBeGreaterThanOrEqual(height - depth)
      }
    })
  })

  it('should listAccountHistory with options no_rewards', async () => {
    const options = {
      no_rewards: true
    }
    await waitForExpect(async () => {
      const accountHistories = await client.account.listAccountHistory('mine', options)
      expect(accountHistories.length).toBeGreaterThan(0)
    })

    const accountHistories = await client.account.listAccountHistory('mine', options)
    for (let i = 0; i < accountHistories.length; i += 1) {
      const accountHistory = accountHistories[i]
      expect(accountHistory.txn).not.toStrictEqual('blockReward')
    }
  })

  it('should listAccountHistory with options token', async () => {
    const options = {
      token: 'DBTC'
    }
    await waitForExpect(async () => {
      const accountHistories = await client.account.listAccountHistory('mine', options)
      expect(accountHistories.length).toBeGreaterThan(0)
    })

    const accountHistories = await client.account.listAccountHistory('mine', options)
    for (let i = 0; i < accountHistories.length; i += 1) {
      const accountHistory = accountHistories[i]
      expect(accountHistory.amounts.length).toBeGreaterThan(0)
      for (let j = 0; j < accountHistory.amounts.length; j += 1) {
        const amount = accountHistory.amounts[j]
        const symbol = amount.split('@')[1]
        expect(symbol).toStrictEqual('DBTC')
      }
    }
  })

  it('should listAccountHistory with options txtype', async () => {
    await waitForExpect(async () => {
      const accountHistories = await client.account.listAccountHistory('mine', { txtype: DfTxType.MINT_TOKEN })
      expect(accountHistories.length).toBeGreaterThan(0)
    })

    const accountHistories = await client.account.listAccountHistory('mine', { txtype: DfTxType.MINT_TOKEN })
    for (let i = 0; i < accountHistories.length; i += 1) {
      const accountHistory = accountHistories[i]
      expect(accountHistory.type).toStrictEqual('MintToken')
    }
  })

  it('should listAccountHistory with options limit', async () => {
    await waitForExpect(async () => {
      const options = {
        limit: 1
      }
      const accountHistories = await client.account.listAccountHistory('mine', options)
      expect(accountHistories.length).toStrictEqual(1)
    })
  })
})

describe.only('listAccountHistory', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  let from: string

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    from = await container.call('getnewaddress')
    await createToken(from, 'DBTC', 10)
  })

  afterAll(async () => {
    await container.stop()
  })

  async function createToken (address: string, symbol: string, amount: number): Promise<void> {
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

  it('should contain accountToAccount histories', async () => {
    const payload: BalanceTransferPayload = {}
    payload[await container.getNewAddress()] = '8.99@DBTC'

    await client.account.accountToAccount(from, payload)
    await container.generate(1)

    const history = await client.account.listAccountHistory()

    expect(history.find((h) => h.type === 'AccountToAccount' && h.amounts[0] === '8.99000000@DBTC')).toBeTruthy()
  })
})
