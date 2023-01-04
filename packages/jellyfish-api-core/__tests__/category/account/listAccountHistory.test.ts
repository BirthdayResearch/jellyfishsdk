import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { AccountOwner, AccountResult, BalanceTransferPayload, DfTxType, Format } from '../../../src/category/account'

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
  const txtypes = [DfTxType.BURN_TOKEN, DfTxType.MINT_TOKEN]

  let addr1: string
  let addr2: string

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)

    addr1 = await container.getNewAddress()
    addr2 = await container.getNewAddress()

    await createToken(addr1, 'dBTC', 201)
    await createToken(addr2, 'dETH', 100)

    for (let i = 1; i <= 10; i++) {
      await client.token.burnTokens(`${0.01 * i}@dBTC`, addr1)
      await client.token.burnTokens(`${0.01 * i}@dETH`, addr2)
      await container.generate(1)
    }
  })

  afterAll(async () => {
    await container.stop()
  })

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
    const accounts: Array<AccountResult<AccountOwner, string>> = await client.account.listAccounts()

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
      token: 'dBTC'
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
        expect(symbol).toStrictEqual('dBTC')
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

  it('should listAccountHistory with options owner mine block height and txn', async () => {
    const options = {
      maxBlockHeight: 102,
      txn: 2
    }
    const accountHistories = await client.account.listAccountHistory('mine', options)
    expect(accountHistories.length).toBeGreaterThan(0)
    accountHistories.forEach(accountHistory => {
      expect(accountHistory.blockHeight).toBeLessThanOrEqual(options.maxBlockHeight)
      if (accountHistory.blockHeight === options.maxBlockHeight) {
        expect(accountHistory.txn).toBeLessThanOrEqual(options.txn)
      }
    })
  })

  // If you don't set maxBlockHeight, it will consider the last block height
  it('should listAccountHistory with owner mine options txn', async () => {
    const options = {
      txn: 2
    }
    const accountHistories = await client.account.listAccountHistory('mine', options)
    expect(accountHistories.length).toBeGreaterThan(0)
    accountHistories.forEach(accountHistory => {
      expect(accountHistory.blockHeight).toBeLessThanOrEqual(125)
      if (accountHistory.blockHeight === 125) {
        expect(accountHistory.txn).toBeLessThanOrEqual(options.txn)
      }
    })
  })

  it('should listAccountHistory with owner all options block height and txn', async () => {
    const options = {
      maxBlockHeight: 102,
      txn: 1
    }
    const accountHistories = await client.account.listAccountHistory('all', options)
    expect(accountHistories.length).toBeGreaterThan(0)
    accountHistories.forEach(accountHistory => {
      expect(accountHistory.blockHeight).toBeLessThanOrEqual(options.maxBlockHeight)
      if (accountHistory.blockHeight === options.maxBlockHeight) {
        expect(accountHistory.txn).toBeLessThanOrEqual(options.txn)
      }
    })
  })

  it('should listAccountHistory with owner all options block height, type and txn', async () => {
    const options = {
      maxBlockHeight: 103,
      txn: 2,
      txtype: DfTxType.MINT_TOKEN
    }
    const accountHistories = await client.account.listAccountHistory('all', options)
    expect(accountHistories.length).toBeGreaterThan(0)
    accountHistories.forEach(accountHistory => {
      expect(accountHistory.blockHeight).toBeLessThanOrEqual(options.maxBlockHeight)
      if (accountHistory.blockHeight === options.maxBlockHeight) {
        expect(accountHistory.txn).toBeLessThanOrEqual(options.txn)
      }
      expect(accountHistory.type).toStrictEqual('MintToken')
    })
  })

  it('should listAccountHistory with owner CScript options block height and txn 1', async () => {
    const accounts: Array<AccountResult<AccountOwner, string>> = await client.account.listAccounts()

    const { owner } = accounts[0]
    const { hex, addresses } = owner

    const options = {
      maxBlockHeight: 105,
      txn: 1
    }
    const accountHistories = await client.account.listAccountHistory(hex, options)
    expect(accountHistories.length).toBeGreaterThan(0)
    accountHistories.forEach(accountHistory => {
      expect(addresses.includes(accountHistory.owner)).toStrictEqual(true)
      expect(accountHistory.blockHeight).toBeLessThanOrEqual(options.maxBlockHeight)
      if (accountHistory.blockHeight === options.maxBlockHeight) {
        expect(accountHistory.txn).toBeLessThanOrEqual(options.txn)
      }
    })
  })

  it('should listAccountHistory with owner CScript options block height and txn 0', async () => {
    const accounts: Array<AccountResult<AccountOwner, string>> = await client.account.listAccounts()

    const { owner } = accounts[0]
    const { hex, addresses } = owner

    const options = {
      maxBlockHeight: 105,
      txn: 0
    }
    const accountHistories = await client.account.listAccountHistory(hex, options)
    expect(accountHistories.length).toBeGreaterThan(0)
    accountHistories.forEach(accountHistory => {
      expect(addresses.includes(accountHistory.owner)).toStrictEqual(true)
      expect(accountHistory.blockHeight).toBeLessThanOrEqual(options.maxBlockHeight)
      if (accountHistory.blockHeight === options.maxBlockHeight) {
        expect(accountHistory.txn).toBeLessThanOrEqual(options.txn)
      }
    })
  })

  it('should listAccountHistory with options format', async () => {
    { // amount format should be id
      const options = {
        token: 'dBTC',
        format: Format.ID
      }
      const accountHistories = await client.account.listAccountHistory('mine', options)
      expect(accountHistories.length).toBeGreaterThan(0)
      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(accountHistory.amounts.length).toBeGreaterThan(0)
        for (let j = 0; j < accountHistory.amounts.length; j += 1) {
          const amount = accountHistory.amounts[j]
          const id = amount.split('@')[1]
          expect(id).toStrictEqual('1')
        }
      }
    }

    { // amount format should be symbol
      const options = {
        token: 'dBTC',
        format: Format.SYMBOL
      }
      const accountHistories = await client.account.listAccountHistory('mine', options)
      expect(accountHistories.length).toBeGreaterThan(0)
      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(accountHistory.amounts.length).toBeGreaterThan(0)
        for (let j = 0; j < accountHistory.amounts.length; j += 1) {
          const amount = accountHistory.amounts[j]
          const symbol = amount.split('@')[1]
          expect(symbol).toStrictEqual('dBTC')
        }
      }
    }

    { // amount format default should be symbol
      const options = {
        token: 'DFI'
      }
      const accountHistories = await client.account.listAccountHistory('mine', options)
      expect(accountHistories.length).toBeGreaterThan(0)
      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(accountHistory.amounts.length).toBeGreaterThan(0)
        for (let j = 0; j < accountHistory.amounts.length; j += 1) {
          const amount = accountHistory.amounts[j]
          const symbol = amount.split('@')[1]
          expect(symbol).toStrictEqual('DFI')
        }
      }
    }
  })

  it('should listAccountHistory with multiple addresses', async () => {
    const accountHistoryAll = await client.account.listAccountHistory([addr1, addr2])
    expect(accountHistoryAll.length).toStrictEqual(34)
  })

  it('should listAccountHistory with multiple addresses and txtypes', async () => {
    const accountHistoryAll = await client.account.listAccountHistory([addr1, addr2], { txtypes })
    expect(accountHistoryAll.length).toStrictEqual(22)
  })

  it('should listAccountHistory with multiple addresses, txtypes along with index based pagination', async () => {
    const accountHistoryAll = await client.account.listAccountHistory([addr1, addr2], { txtypes })
    expect(accountHistoryAll.length).toStrictEqual(22)

    const accountHistory1 = await client.account.listAccountHistory([addr1, addr2], { start: 2, txtypes })
    expect(accountHistory1[0].txid).toStrictEqual(accountHistoryAll[3].txid)
    expect(accountHistory1.length).toStrictEqual(19)

    const accountHistory2 = await client.account.listAccountHistory([addr1, addr2], { start: 2, including_start: true, txtypes })
    expect(accountHistory2[0].txid).toStrictEqual(accountHistoryAll[2].txid)
    expect(accountHistory2.length).toStrictEqual(20)

    const accountHistory3 = await client.account.listAccountHistory([addr1, addr2], { start: 2, including_start: true, limit: 3, txtypes })
    expect(accountHistory3[0].txid).toStrictEqual(accountHistoryAll[2].txid)
    expect(accountHistory3[2].txid).toStrictEqual(accountHistoryAll[4].txid)
    expect(accountHistory3.length).toStrictEqual(3)
  })
})

describe('listAccountHistory', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  const createToken = createTokenForContainer(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should contain accountToAccount histories', async () => {
    const from = await container.call('getnewaddress')
    await createToken(from, 'DBTC', 10)
    const payload: BalanceTransferPayload = {}
    payload[await container.getNewAddress()] = '8.99@DBTC'

    await client.account.accountToAccount(from, payload)
    await container.generate(1)

    const history = await client.account.listAccountHistory('mine', { limit: 100, no_rewards: true })

    expect(history).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'AccountToAccount',
          amounts: expect.arrayContaining([
            '8.99000000@DBTC'
          ])
        })
      ])
    )
  })

  it('should contain UtxosToAccount histories', async () => {
    const from = await container.call('getnewaddress')

    const payload: BalanceTransferPayload = {}
    payload[from] = '4.97@DFI'

    await client.account.utxosToAccount(payload)
    await container.generate(1)

    const history = await client.account.listAccountHistory('mine', { limit: 100, no_rewards: true })

    expect(history).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'UtxosToAccount',
          amounts: expect.arrayContaining([
            '4.97000000@DFI'
          ])
        })
      ])
    )
  })

  it('should contain AccountToUtxos histories', async () => {
    const from = await container.call('getnewaddress')

    const utxosToAccountPayload: BalanceTransferPayload = {}
    utxosToAccountPayload[from] = '4.97@DFI'

    await client.account.utxosToAccount(utxosToAccountPayload)
    await container.generate(1)

    const accountToUtxosPayload: BalanceTransferPayload = {}
    accountToUtxosPayload[await container.getNewAddress()] = '3.97@DFI'

    await client.account.accountToUtxos(from, accountToUtxosPayload)
    await container.generate(1)
    const history = await client.account.listAccountHistory('mine', { limit: 100, no_rewards: true })

    expect(history).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'UtxosToAccount',
          amounts: expect.arrayContaining([
            '4.97000000@DFI'
          ])
        })
      ])
    )
    expect(history).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'AccountToUtxos',
          amounts: expect.arrayContaining([
            '-3.97000000@DFI'
          ])
        })
      ])
    )
  })
})

describe('listAccountHistory for poolpair', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const createToken = createTokenForContainer(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(200)
    const address = await container.call('getnewaddress')
    await container.call('utxostoaccount', [{ [address]: '100@0' }])
    await createToken(address, 'DDAI', 2000)

    await client.poolpair.createPoolPair({
      tokenA: 'DFI',
      tokenB: 'DDAI',
      commission: 0,
      status: true,
      ownerAddress: await container.call('getnewaddress')
    })
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should show AddPoolLiquidity', async () => {
    await client.poolpair.addPoolLiquidity({
      '*': ['10@DFI', '200@DDAI']
    }, await container.call('getnewaddress'))
    await container.generate(1)

    const histories = await client.account.listAccountHistory('mine', { limit: 100, no_rewards: true })

    const records = histories.filter((h) => h.type === 'AddPoolLiquidity')

    expect(records.length).toStrictEqual(2)

    expect(records).toStrictEqual(expect.arrayContaining([
      expect.objectContaining({
        amounts: expect.arrayContaining([
          expect.stringContaining('DFI-DDAI')
        ])
      }),
      expect.objectContaining({
        amounts: expect.arrayContaining([
          '-10.00000000@DFI',
          '-200.00000000@DDAI'
        ])
      })
    ]))
  })

  it('should show RemovePoolLiquidity', async () => {
    const poolAddress = await container.call('getnewaddress')
    await client.poolpair.addPoolLiquidity({
      '*': ['10@DFI', '200@DDAI']
    }, poolAddress)
    await container.generate(1)
    await container.call('removepoolliquidity', [poolAddress, '20@DFI-DDAI'])
    await container.generate(1)

    const histories = await client.account.listAccountHistory('mine', { limit: 100, no_rewards: true })

    expect(histories).toStrictEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'RemovePoolLiquidity',
        amounts: expect.arrayContaining(['-20.00000000@DFI-DDAI'])
      })
    ]))
  })

  it('should show PoolSwap', async () => {
    const address = await container.call('getnewaddress')
    await container.call('utxostoaccount', [{ [address]: '100@0' }])

    await client.poolpair.addPoolLiquidity({
      '*': ['10@DFI', '200@DDAI']
    }, await container.call('getnewaddress'))
    await container.generate(1)
    const metadata = {
      from: address,
      tokenFrom: 'DFI',
      amountFrom: '5',
      to: await container.call('getnewaddress'),
      tokenTo: 'DDAI'
    }

    await container.call('poolswap', [metadata])
    await container.generate(1)

    const histories = await client.account.listAccountHistory('mine', { limit: 100, no_rewards: true })

    expect(histories).toStrictEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'PoolSwap',
        amounts: expect.arrayContaining(['-5.00000000@DFI'])
      })
    ]))
  })
})
