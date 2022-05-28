import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient
let testing: Testing

let colAddr: string
let usdcAddr: string
let poolAddr: string
let emptyAddr: string

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)
  testing = Testing.create(container)

  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()
  await service.start()

  colAddr = await testing.generateAddress()
  usdcAddr = await testing.generateAddress()
  poolAddr = await testing.generateAddress()
  emptyAddr = await testing.generateAddress()

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

  const height = await testing.container.getBlockCount()
  await testing.generate(1)
  await service.waitForIndexedHeight(height - 1)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await testing.container.stop()
  }
})

describe('listAccountHistory', () => {
  it('should not listAccountHistory with mine filter', async () => {
    const promise = client.address.listAccountHistory('mine')
    await expect(promise).rejects.toThrow(WhaleApiException)
    await expect(promise).rejects.toThrow('mine is not allowed')
  })

  it('should list empty account history', async () => {
    const history = await client.address.listAccountHistory(emptyAddr)
    expect(history.length).toStrictEqual(0)
  })

  it('should listAccountHistory', async () => {
    const history = await client.address.listAccountHistory(colAddr)

    expect(history.length).toStrictEqual(30)
    for (let i = 0; i < history.length; i += 1) {
      const accountHistory = history[i]
      expect(typeof accountHistory.owner).toStrictEqual('string')
      expect(typeof accountHistory.block.height).toStrictEqual('number')
      expect(typeof accountHistory.block.hash).toStrictEqual('string')
      expect(typeof accountHistory.block.time).toStrictEqual('number')
      expect(typeof accountHistory.type).toStrictEqual('string')
      expect(typeof accountHistory.txn).toStrictEqual('number')
      expect(typeof accountHistory.txid).toStrictEqual('string')
      expect(accountHistory.amounts.length).toBeGreaterThan(0)
      expect(typeof accountHistory.amounts[0]).toStrictEqual('string')
    }
  })

  it('should listAccountHistory with size', async () => {
    const history = await client.address.listAccountHistory(colAddr, 10)
    expect(history.length).toStrictEqual(10)
  })

  it('test listAccountHistory pagination', async () => {
    const full = await client.address.listAccountHistory(colAddr, 12)

    const first = await client.address.listAccountHistory(colAddr, 3)
    expect(first[0]).toStrictEqual(full[0])
    expect(first[1]).toStrictEqual(full[1])
    expect(first[2]).toStrictEqual(full[2])

    const firstLast = first[first.length - 1]
    const secondToken = `${firstLast.txid}-${firstLast.type}-${firstLast.block.height}`
    const second = await client.address.listAccountHistory(colAddr, 3, secondToken)
    expect(second[0]).toStrictEqual(full[3])
    expect(second[1]).toStrictEqual(full[4])
    expect(second[2]).toStrictEqual(full[5])

    const secondLast = second[second.length - 1]
    const thirdToken = `${secondLast.txid}-${secondLast.type}-${secondLast.block.height}`
    const third = await client.address.listAccountHistory(colAddr, 3, thirdToken)
    expect(third[0]).toStrictEqual(full[6])
    expect(third[1]).toStrictEqual(full[7])
    expect(third[2]).toStrictEqual(full[8])

    const thirdLast = third[third.length - 1]
    const forthToken = `${thirdLast.txid}-${thirdLast.type}-${thirdLast.block.height}`
    const forth = await client.address.listAccountHistory(colAddr, 3, forthToken)
    expect(forth[0]).toStrictEqual(full[9])
    expect(forth[1]).toStrictEqual(full[10])
    expect(forth[2]).toStrictEqual(full[11])
  })
})

describe('getAccountHistory', () => {
  it('should getAccountHistory', async () => {
    const history = await client.address.listAccountHistory(colAddr, 30)
    for (const h of history) {
      if (['sent', 'receive'].includes(h.type)) {
        continue
      }
      const acc = await client.address.getAccountHistory(colAddr, h.block.height, h.txn)
      expect(acc?.owner).toStrictEqual(h.owner)
      expect(acc?.txid).toStrictEqual(h.txid)
      expect(acc?.txn).toStrictEqual(h.txn)
    }

    const poolHistory = await client.address.listAccountHistory(poolAddr, 30)
    for (const h of poolHistory) {
      if (['sent', 'receive'].includes(h.type)) {
        continue
      }
      const acc = await client.address.getAccountHistory(poolAddr, h.block.height, h.txn)
      expect(acc?.owner).toStrictEqual(h.owner)
      expect(acc?.txid).toStrictEqual(h.txid)
      expect(acc?.txn).toStrictEqual(h.txn)
    }
  })

  it('should be failed as getting unsupport tx type - sent, received, blockReward', async () => {
    const history = await client.address.listAccountHistory(colAddr, 30)
    for (const h of history) {
      if (['sent', 'receive'].includes(h.type)) {
        const promise = client.address.getAccountHistory(colAddr, h.block.height, h.txn)
        await expect(promise).rejects.toThrow('Record not found')
      }
    }

    const operatorAccHistory = await container.call('listaccounthistory', [RegTestFoundationKeys[0].operator.address])
    for (const h of operatorAccHistory) {
      if (['blockReward'].includes(h.type)) {
        const promise = client.address.getAccountHistory(RegTestFoundationKeys[0].operator.address, h.blockHeight, h.txn)
        await expect(promise).rejects.toThrow('Record not found')
      }
    }
  })
})
