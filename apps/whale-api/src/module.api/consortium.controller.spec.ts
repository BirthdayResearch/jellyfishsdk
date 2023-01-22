import { ConsortiumController } from './consortium.controller'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { StartFlags } from '@defichain/testcontainers'
import { NotFoundException } from '@nestjs/common'

const tGroup = TestingGroup.create(2)
const alice = tGroup.get(0)
const bob = tGroup.get(1)
const symbolBTC = 'BTC'
const symbolETH = 'ETH'
let accountAlice: string, accountBob: string
let idBTC: string
let idETH: string
let app: NestFastifyApplication
let controller: ConsortiumController
const startFlags: StartFlags[] = [{ name: 'regtest-minttoken-simulate-mainnet', value: 1 }]

async function setGovAttr (attributes: object): Promise<void> {
  const hash = await alice.rpc.masternode.setGov({ ATTRIBUTES: attributes })
  expect(hash).toBeTruthy()
  await alice.generate(1)
  await tGroup.waitForSync()
}

async function setMemberInfo (tokenId: string, memberInfo: Array<{ id: string, name: string, backingId: string, ownerAddress: string, mintLimit: string, mintLimitDaily: string }>): Promise<void> {
  const members: { [key: string]: { [key: string]: string } } = {}

  memberInfo.forEach(mi => {
    members[mi.id] = {
      name: mi.name,
      ownerAddress: mi.ownerAddress,
      backingId: mi.backingId,
      mintLimitDaily: mi.mintLimitDaily,
      mintLimit: mi.mintLimit
    }
  })

  return await setGovAttr({ [`v0/consortium/${tokenId}/members`]: members })
}

async function setup (): Promise<void> {
  accountAlice = await alice.generateAddress()
  accountBob = await bob.generateAddress()

  await alice.token.create({
    symbol: symbolBTC,
    name: symbolBTC,
    isDAT: true,
    mintable: true,
    tradeable: true,
    collateralAddress: accountAlice
  })
  await alice.generate(1)

  await alice.token.create({
    symbol: symbolETH,
    name: symbolETH,
    isDAT: true,
    mintable: true,
    tradeable: true,
    collateralAddress: accountAlice
  })
  await alice.generate(1)

  await alice.container.fundAddress(accountBob, 10)
  await alice.generate(1)
  idBTC = await alice.token.getTokenId(symbolBTC)
  idETH = await alice.token.getTokenId(symbolETH)

  await setGovAttr({
    'v0/params/feature/consortium': 'true',
    [`v0/consortium/${idBTC}/mint_limit`]: '10',
    [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',
    [`v0/consortium/${idETH}/mint_limit`]: '20',
    [`v0/consortium/${idETH}/mint_limit_daily`]: '10'
  })

  await setMemberInfo(idBTC, [{
    id: '01',
    name: 'alice',
    ownerAddress: accountAlice,
    backingId: 'abc',
    mintLimitDaily: '5.00000000',
    mintLimit: '10.00000000'
  }, {
    id: '02',
    name: 'bob',
    ownerAddress: accountBob,
    backingId: 'def,hij',
    mintLimitDaily: '5.00000000',
    mintLimit: '10.00000000'
  }])

  await setMemberInfo(idETH, [{
    id: '01',
    name: 'alice',
    ownerAddress: accountAlice,
    backingId: '',
    mintLimitDaily: '10.00000000',
    mintLimit: '20.00000000'
  }, {
    id: '02',
    name: 'bob',
    ownerAddress: accountBob,
    backingId: ' lmn ,    opq',
    mintLimitDaily: '10.00000000',
    mintLimit: '20.00000000'
  }])
}

describe('getAssetBreakdown', () => {
  beforeEach(async () => {
    await tGroup.start({ startFlags })
    await alice.container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(alice.container)
    controller = app.get(ConsortiumController)
  })

  afterEach(async () => {
    await stopTestingApp(tGroup, app)
  })

  it('should return an empty list if theres no consortium members or tokens initialized', async () => {
    const info = await controller.getAssetBreakdown()
    expect(info).toStrictEqual([])
  })

  it('should return a list with amounts set to 0 if the mint/burn transactions does not exists', async () => {
    await setup()

    const info = await controller.getAssetBreakdown()
    expect(info).toStrictEqual([{
      tokenSymbol: symbolBTC,
      tokenDisplaySymbol: `d${symbolBTC}`,
      memberInfo: [
        { id: '01', name: 'alice', minted: '0.00000000', burned: '0.00000000', backingAddresses: ['abc'], tokenId: idBTC },
        { id: '02', name: 'bob', minted: '0.00000000', burned: '0.00000000', backingAddresses: ['def', 'hij'], tokenId: idBTC }
      ]
    }, {
      tokenSymbol: symbolETH,
      tokenDisplaySymbol: `d${symbolETH}`,
      memberInfo: [
        { id: '01', name: 'alice', minted: '0.00000000', burned: '0.00000000', backingAddresses: [], tokenId: idETH },
        { id: '02', name: 'bob', minted: '0.00000000', burned: '0.00000000', backingAddresses: ['lmn', 'opq'], tokenId: idETH }
      ]
    }])
  })

  it('should return a list with valid mint/burn information', async () => {
    await setup()

    await alice.rpc.token.mintTokens({ amounts: [`1@${symbolBTC}`] })
    await alice.generate(1)

    await alice.rpc.token.mintTokens({ amounts: [`2@${symbolETH}`] })
    await alice.generate(1)

    await alice.rpc.token.burnTokens(`1@${symbolETH}`, accountAlice)
    await alice.generate(1)

    await bob.rpc.token.mintTokens({ amounts: [`4@${symbolBTC}`] })
    await bob.generate(1)

    await bob.rpc.token.burnTokens(`2@${symbolBTC}`, accountBob)
    await bob.generate(1)

    await tGroup.waitForSync()

    const info = await controller.getAssetBreakdown()
    expect(info).toStrictEqual([{
      tokenSymbol: symbolBTC,
      tokenDisplaySymbol: `d${symbolBTC}`,
      memberInfo: [
        { id: '01', name: 'alice', minted: '1.00000000', burned: '0.00000000', backingAddresses: ['abc'], tokenId: idBTC },
        { id: '02', name: 'bob', minted: '4.00000000', burned: '2.00000000', backingAddresses: ['def', 'hij'], tokenId: idBTC }
      ]
    }, {
      tokenSymbol: symbolETH,
      tokenDisplaySymbol: `d${symbolETH}`,
      memberInfo: [
        { id: '01', name: 'alice', minted: '2.00000000', burned: '1.00000000', backingAddresses: [], tokenId: idETH },
        { id: '02', name: 'bob', minted: '0.00000000', burned: '0.00000000', backingAddresses: ['lmn', 'opq'], tokenId: idETH }
      ]
    }])
  })
})

describe('getMemberStats', () => {
  beforeEach(async () => {
    await tGroup.start({ startFlags })
    await alice.container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(alice.container)
    controller = app.get(ConsortiumController)
  })

  afterEach(async () => {
    await stopTestingApp(tGroup, app)
  })

  it('should throw an error if given consortium member id does not exists', async () => {
    await setup()

    const promise = controller.getMemberStats('01234')
    await expect(promise).rejects.toThrow(NotFoundException)
    await expect(promise).rejects.toThrow('Consortium member not found')
  })

  it('should return minted amounts of 0 if the mint transaction does not exists', async () => {
    await setup()

    const stats = await controller.getMemberStats('01')
    expect(stats).toStrictEqual(
      {
        memberId: '01',
        memberName: 'alice',
        mintTokens: [
          { tokenSymbol: symbolBTC, tokenDisplaySymbol: `d${symbolBTC}`, tokenId: '1', member: { minted: '0.00000000', mintedDaily: '0.00000000', mintLimit: '10.00000000', mintDailyLimit: '5.00000000' }, token: { minted: '0.00000000', mintedDaily: '0.00000000', mintLimit: '10.00000000', mintDailyLimit: '5.00000000' } },
          { tokenSymbol: symbolETH, tokenDisplaySymbol: `d${symbolETH}`, tokenId: '2', member: { minted: '0.00000000', mintedDaily: '0.00000000', mintLimit: '20.00000000', mintDailyLimit: '10.00000000' }, token: { minted: '0.00000000', mintedDaily: '0.00000000', mintLimit: '20.00000000', mintDailyLimit: '10.00000000' } }
        ]
      })
  })

  it('should return complete mint stats of the member', async () => {
    await setup()

    await alice.rpc.token.mintTokens({ amounts: [`1@${symbolBTC}`, `2@${symbolETH}`] })
    await alice.generate(1)

    await bob.rpc.token.mintTokens({ amounts: [`1.5@${symbolBTC}`, `3@${symbolETH}`] })
    await bob.generate(1)

    await tGroup.waitForSync()

    const stats = await controller.getMemberStats('02')
    expect(stats).toStrictEqual(
      {
        memberId: '02',
        memberName: 'bob',
        mintTokens: [
          { tokenSymbol: symbolBTC, tokenDisplaySymbol: `d${symbolBTC}`, tokenId: '1', member: { minted: '1.50000000', mintedDaily: '1.50000000', mintLimit: '10.00000000', mintDailyLimit: '5.00000000' }, token: { minted: '2.50000000', mintedDaily: '2.50000000', mintLimit: '10.00000000', mintDailyLimit: '5.00000000' } },
          { tokenSymbol: symbolETH, tokenDisplaySymbol: `d${symbolETH}`, tokenId: '2', member: { minted: '3.00000000', mintedDaily: '3.00000000', mintLimit: '20.00000000', mintDailyLimit: '10.00000000' }, token: { minted: '5.00000000', mintedDaily: '5.00000000', mintLimit: '20.00000000', mintDailyLimit: '10.00000000' } }
        ]
      })
  })

  it('should return overall minted amount for all blocks generated', async () => {
    await setup()

    await alice.rpc.token.mintTokens({ amounts: [`1@${symbolBTC}`, `1@${symbolETH}`] })
    await alice.generate(1)

    await bob.rpc.token.mintTokens({ amounts: [`4@${symbolBTC}`] })

    const height = await bob.container.call('getblockcount')
    const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest
    await bob.generate(blocksPerDay - height) // Generate enough blocks for 1 day

    await bob.rpc.token.mintTokens({ amounts: [`2@${symbolBTC}`, `3.2@${symbolETH}`] }) // Next day mint
    await bob.generate(1)

    await tGroup.waitForSync()

    const stats = await controller.getMemberStats('02')
    expect(stats).toStrictEqual(
      {
        memberId: '02',
        memberName: 'bob',
        mintTokens: [
          { tokenSymbol: symbolBTC, tokenDisplaySymbol: `d${symbolBTC}`, tokenId: '1', member: { minted: '6.00000000', mintedDaily: '2.00000000', mintLimit: '10.00000000', mintDailyLimit: '5.00000000' }, token: { minted: '7.00000000', mintedDaily: '3.00000000', mintLimit: '10.00000000', mintDailyLimit: '5.00000000' } },
          { tokenSymbol: symbolETH, tokenDisplaySymbol: `d${symbolETH}`, tokenId: '2', member: { minted: '3.20000000', mintedDaily: '3.20000000', mintLimit: '20.00000000', mintDailyLimit: '10.00000000' }, token: { minted: '4.20000000', mintedDaily: '4.20000000', mintLimit: '20.00000000', mintDailyLimit: '10.00000000' } }
        ]
      }
    )
  })
})

describe('getTransactionHistory', () => {
  const txIdMatcher = expect.stringMatching(/^[0-9a-f]{64}$/)
  const txIds: string[] = []

  beforeAll(async () => {
    await tGroup.start({ startFlags })
    await alice.container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(alice.container)
    controller = app.get(ConsortiumController)

    await setup()
  })

  afterAll(async () => {
    await stopTestingApp(tGroup, app)
  })

  async function setup (): Promise<void> {
    accountAlice = await alice.generateAddress()
    accountBob = await bob.generateAddress()

    await alice.token.create({
      symbol: symbolBTC,
      name: symbolBTC,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: accountAlice
    })
    await alice.generate(1)

    await alice.token.create({
      symbol: symbolETH,
      name: symbolETH,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: accountAlice
    })
    await alice.generate(1)

    idBTC = await alice.token.getTokenId(symbolBTC)
    idETH = await alice.token.getTokenId(symbolETH)

    await setGovAttr({
      'v0/params/feature/consortium': 'true',
      [`v0/consortium/${idBTC}/mint_limit`]: '20',
      [`v0/consortium/${idBTC}/mint_limit_daily`]: '10',
      [`v0/consortium/${idETH}/mint_limit`]: '40',
      [`v0/consortium/${idETH}/mint_limit_daily`]: '20'
    })

    await setMemberInfo(idBTC, [{
      id: '01',
      name: 'alice',
      ownerAddress: accountAlice,
      backingId: 'abc',
      mintLimitDaily: '10',
      mintLimit: '20'
    }, {
      id: '02',
      name: 'bob',
      ownerAddress: accountBob,
      backingId: 'def,hij',
      mintLimitDaily: '10',
      mintLimit: '20'
    }])

    await setMemberInfo(idETH, [{
      id: '01',
      name: 'alice',
      ownerAddress: accountAlice,
      backingId: '',
      mintLimitDaily: '20.00000000',
      mintLimit: '40.00000000'
    }, {
      id: '02',
      name: 'bob',
      ownerAddress: accountBob,
      backingId: 'lmn,opq',
      mintLimitDaily: '20.00000000',
      mintLimit: '40.00000000'
    }])

    txIds.push(await alice.rpc.token.mintTokens({ amounts: [`0.5@${symbolBTC}`] }))
    txIds.push(await bob.rpc.token.mintTokens({ amounts: [`0.5@${symbolBTC}`] }))
    await alice.generate(1)
    await bob.generate(1)
    await tGroup.waitForSync()

    txIds.push(await alice.rpc.token.mintTokens({ amounts: [`0.1@${symbolBTC}`] }))
    txIds.push(await alice.rpc.token.burnTokens(`0.1@${symbolBTC}`, accountAlice))
    txIds.push(await bob.rpc.token.mintTokens({ amounts: [`0.1@${symbolBTC}`] }))
    txIds.push(await bob.rpc.token.burnTokens(`0.1@${symbolBTC}`, accountBob))
    await alice.generate(1)
    await bob.generate(1)
    await tGroup.waitForSync()

    await alice.rpc.token.mintTokens({ amounts: [`1@${symbolBTC}`] })
    await alice.generate(1)

    await alice.rpc.token.mintTokens({ amounts: [`2@${symbolETH}`] })
    await alice.generate(1)

    await alice.rpc.token.burnTokens(`1@${symbolETH}`, accountAlice)
    await alice.generate(1)
    await tGroup.waitForSync()

    await bob.rpc.token.mintTokens({ amounts: [`4@${symbolBTC}`] })
    await bob.generate(1)

    await bob.rpc.token.burnTokens(`2@${symbolBTC}`, accountBob)
    await bob.generate(1)
    await tGroup.waitForSync()

    const height = await alice.container.getBlockCount()
    await alice.generate(1)
    await tGroup.waitForSync()
    await waitForIndexedHeight(app, height)
  }

  it('should throw an error if the limit is invalid', async () => {
    await expect(controller.getTransactionHistory({ limit: 51 })).rejects.toThrow('InvalidLimit')
    await expect(controller.getTransactionHistory({ limit: 0 })).rejects.toThrow('InvalidLimit')
  })

  it('should throw an error if the search term is invalid', async () => {
    await expect(controller.getTransactionHistory({ searchTerm: 'a', limit: 1 })).rejects.toThrow('InvalidSearchTerm')
    await expect(controller.getTransactionHistory({ searchTerm: 'a'.repeat(65), limit: 1 })).rejects.toThrow('InvalidSearchTerm')
  })

  it('should throw an error if the pageIndex is invalid', async () => {
    await expect(controller.getTransactionHistory({ pageIndex: -1, limit: 1 })).rejects.toThrow('InvalidPageIndex')
  })

  it('should filter transactions with search term (member name)', async () => {
    const info = await controller.getTransactionHistory({ searchTerm: 'alice', limit: 3 })

    expect(info.transactions.length).toStrictEqual(3)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: symbolETH, amount: '-1.00000000' }], address: accountAlice, block: 113 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: symbolETH, amount: '2.00000000' }], address: accountAlice, block: 112 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: symbolBTC, amount: '1.00000000' }], address: accountAlice, block: 111 }
    ])
    expect(info.total).toStrictEqual(6)
  })

  it('should filter transactions with search term (owner address)', async () => {
    const info = await controller.getTransactionHistory({ searchTerm: accountAlice, limit: 3 })

    expect(info.transactions.length).toStrictEqual(3)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: symbolETH, amount: '-1.00000000' }], address: accountAlice, block: 113 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: symbolETH, amount: '2.00000000' }], address: accountAlice, block: 112 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: symbolBTC, amount: '1.00000000' }], address: accountAlice, block: 111 }
    ])
    expect(info.total).toStrictEqual(6)
  })

  it('should filter transactions with search term (transaction id)', async () => {
    const tx = (await alice.rpc.account.listAccountHistory(accountAlice))[0]

    const info = await controller.getTransactionHistory({ searchTerm: tx.txid, limit: 20 })

    expect(info.transactions.length).toStrictEqual(1)
    expect(info.transactions).toStrictEqual([
      { txId: tx.txid, type: 'Burn', member: 'alice', tokenAmounts: [{ token: symbolETH, amount: '-1.00000000' }], address: accountAlice, block: 113 }
    ])
    expect(info.total).toStrictEqual(1)
  })

  it('should limit transactions', async () => {
    const info = await controller.getTransactionHistory({ limit: 3 })

    expect(info.transactions.length).toStrictEqual(3)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'bob', tokenAmounts: [{ token: symbolBTC, amount: '-2.00000000' }], address: accountBob, block: 115 },
      { txId: txIdMatcher, type: 'Mint', member: 'bob', tokenAmounts: [{ token: symbolBTC, amount: '4.00000000' }], address: accountBob, block: 114 },
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: symbolETH, amount: '-1.00000000' }], address: accountAlice, block: 113 }
    ])
    expect(info.total).toStrictEqual(11)
  })

  it('should filter and limit transactions at the same time', async () => {
    const info = await controller.getTransactionHistory({ searchTerm: accountAlice, limit: 2 })

    expect(info.transactions.length).toStrictEqual(2)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: symbolETH, amount: '-1.00000000' }], address: accountAlice, block: 113 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: symbolETH, amount: '2.00000000' }], address: accountAlice, block: 112 }
    ])
    expect(info.total).toStrictEqual(6)
  })

  it('should return empty list of transactions for not-found search term', async () => {
    const info = await controller.getTransactionHistory({ searchTerm: 'not-found-term', limit: 20 })

    expect(info.transactions.length).toStrictEqual(0)
    expect(info.total).toStrictEqual(0)
  })

  it('should not return other transactions from consortium members apart from mints or burns', async () => {
    const { txid } = await alice.container.fundAddress(accountBob, 11.5)

    const height = await alice.container.getBlockCount()
    await alice.generate(1)
    await waitForIndexedHeight(app, height)

    const info = await controller.getTransactionHistory({ searchTerm: txid, limit: 20 })

    expect(info.transactions.length).toStrictEqual(0)
    expect(info.total).toStrictEqual(0)
  })

  it('should paginate properly', async () => {
    const page1 = await controller.getTransactionHistory({ pageIndex: 0, limit: 2 })
    expect(page1).toStrictEqual({
      transactions: [
        {
          type: 'Burn',
          member: 'bob',
          tokenAmounts: [{ token: symbolBTC, amount: '-2.00000000' }],
          txId: txIdMatcher,
          address: accountBob,
          block: 115
        },
        {
          type: 'Mint',
          member: 'bob',
          tokenAmounts: [{ token: symbolBTC, amount: '4.00000000' }],
          txId: txIdMatcher,
          address: accountBob,
          block: 114
        }
      ],
      total: 11
    })

    const page2 = await controller.getTransactionHistory({ pageIndex: 1, limit: 2 })
    expect(page2).toStrictEqual({
      transactions: [
        {
          type: 'Burn',
          member: 'alice',
          tokenAmounts: [{ token: symbolETH, amount: '-1.00000000' }],
          txId: txIdMatcher,
          address: accountAlice,
          block: 113
        },
        {
          type: 'Mint',
          member: 'alice',
          tokenAmounts: [{ token: symbolETH, amount: '2.00000000' }],
          txId: txIdMatcher,
          address: accountAlice,
          block: 112
        }
      ],
      total: 11
    })

    const page3 = await controller.getTransactionHistory({ pageIndex: 2, limit: 2 })
    expect(page3.transactions[0]).toStrictEqual({
      type: 'Mint',
      member: 'alice',
      tokenAmounts: [{ token: symbolBTC, amount: '1.00000000' }],
      txId: txIdMatcher,
      address: accountAlice,
      block: 111
    })
    expect(page3.transactions.length).toStrictEqual(2)
    expect(page3.total).toStrictEqual(11)

    const page4 = await controller.getTransactionHistory({ pageIndex: 3, limit: 2 })
    expect(page4.transactions.length).toStrictEqual(2)
    expect(page4.total).toStrictEqual(11)

    const page5 = await controller.getTransactionHistory({ pageIndex: 4, limit: 2 })
    expect(page5.transactions.length).toStrictEqual(2)
    expect(page5.total).toStrictEqual(11)

    const page6 = await controller.getTransactionHistory({ pageIndex: 5, limit: 2 })
    expect(page6.transactions.length).toStrictEqual(1)
    expect(page6.total).toStrictEqual(11)

    const txsCombined = [page3.transactions[1]].concat(page4.transactions, page5.transactions, page6.transactions)

    txsCombined.forEach(({ txId }) => {
      const index = txIds.indexOf(txId)
      expect(index).toBeGreaterThanOrEqual(0)
      txIds.splice(index, 1)
    })

    expect(txIds.length).toStrictEqual(0)
  })
})
