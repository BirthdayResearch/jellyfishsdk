import { TestingGroup } from '@defichain/jellyfish-testing'
import { StartFlags } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../../../../apps/whale-api/src/e2e.module'

describe('getAssetBreakdown', () => {
  const tGroup = TestingGroup.create(2)
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  const symbolBTC = 'BTC'
  const symbolETH = 'ETH'
  let accountAlice: string, accountBob: string
  let idBTC: string
  let idETH: string
  const startFlags: StartFlags[] = [{ name: 'regtest-minttoken-simulate-mainnet', value: 1 }]

  const service = new StubService(alice.container)
  const client = new StubWhaleApiClient(service)

  beforeEach(async () => {
    await tGroup.start({ startFlags })
    await service.start()
    await alice.container.waitForWalletCoinbaseMaturity()
  })

  afterEach(async () => {
    try {
      await service.stop()
    } finally {
      await tGroup.stop()
    }
  })

  async function setGovAttr (attributes: object): Promise<void> {
    const hash = await alice.rpc.masternode.setGov({ ATTRIBUTES: attributes })
    expect(hash).toBeTruthy()
    await alice.generate(1)
    await tGroup.waitForSync()
  }

  async function setMemberInfo (tokenId: string, memberInfo: Array<{ id: string, name: string, backingId: string, ownerAddress: string, mintLimit: string, dailyMintLimit: string }>): Promise<void> {
    const members: any = {}

    memberInfo.forEach(mi => {
      members[mi.id] = {
        name: mi.name,
        ownerAddress: mi.ownerAddress,
        backingId: mi.backingId,
        mintLimitDaily: mi.dailyMintLimit,
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
      dailyMintLimit: '5.00000000',
      mintLimit: '10.00000000'
    }, {
      id: '02',
      name: 'bob',
      ownerAddress: accountBob,
      backingId: 'def,hij',
      dailyMintLimit: '5.00000000',
      mintLimit: '10.00000000'
    }])

    await setMemberInfo(idETH, [{
      id: '01',
      name: 'alice',
      ownerAddress: accountAlice,
      backingId: '',
      dailyMintLimit: '10.00000000',
      mintLimit: '20.00000000'
    }, {
      id: '02',
      name: 'bob',
      ownerAddress: accountBob,
      backingId: ' lmn ,    opq',
      dailyMintLimit: '10.00000000',
      mintLimit: '20.00000000'
    }])
  }

  it('should respond an empty list if theres no consortium members or tokens initialized', async () => {
    const info = await client.consortium.getAssetBreakdown()
    expect(info).toStrictEqual([])
  })

  it('should return a list with amounts set to 0 if the mint/burn transactions does not exists', async () => {
    await setup()

    const info = await client.consortium.getAssetBreakdown()
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

  it('should respond proper asset breakdown information', async () => {
    await setup()

    await alice.rpc.token.mintTokens(`1@${symbolBTC}`)
    await alice.generate(1)

    await alice.rpc.token.mintTokens(`2@${symbolETH}`)
    await alice.generate(1)

    await alice.rpc.token.burnTokens(`1@${symbolETH}`, accountAlice)
    await alice.generate(1)

    await bob.rpc.token.mintTokens(`4@${symbolBTC}`)
    await bob.generate(1)

    await bob.rpc.token.burnTokens(`2@${symbolBTC}`, accountBob)
    await bob.generate(1)

    await tGroup.waitForSync()

    const info = await client.consortium.getAssetBreakdown()
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

describe('getTransactionHistory', () => {
  const tGroup = TestingGroup.create(2)
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  const symbolBTC = 'dBTC'
  const symbolETH = 'dETH'
  let accountAlice: string, accountBob: string
  let app: NestFastifyApplication
  let idBTC: string
  let idETH: string
  const service = new StubService(alice.container)
  const client = new StubWhaleApiClient(service)
  const txIdMatcher = expect.stringMatching(/[0-f]{64}/)
  const startFlags: StartFlags[] = [{ name: 'regtest-minttoken-simulate-mainnet', value: 1 }]

  beforeAll(async () => {
    await tGroup.start({ startFlags })
    await service.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(alice.container)

    await setup()
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await stopTestingApp(tGroup, app)
    }
  })

  async function setGovAttr (ATTRIBUTES: object): Promise<void> {
    const hash = await alice.rpc.masternode.setGov({ ATTRIBUTES })
    expect(hash).toBeTruthy()
    await alice.generate(1)
    await tGroup.waitForSync()
  }

  async function setMemberInfo (tokenId: string, memberInfo: Array<{ id: string, name: string, backingId: string, ownerAddress: string, mintLimit: string, mintLimitDaily: string }>): Promise<void> {
    const infoObjs: { [key: string]: object } = {}

    memberInfo.forEach(mi => {
      infoObjs[mi.id] = {
        name: mi.name,
        ownerAddress: mi.ownerAddress,
        backingId: mi.backingId,
        mintLimitDaily: mi.mintLimitDaily,
        mintLimit: mi.mintLimit
      }
    })

    return await setGovAttr({ [`v0/consortium/${tokenId}/members`]: infoObjs })
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
      mintLimitDaily: '5',
      mintLimit: '10'
    }, {
      id: '02',
      name: 'bob',
      ownerAddress: accountBob,
      backingId: 'def,hij',
      mintLimitDaily: '5',
      mintLimit: '10'
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
      backingId: 'lmn,opq',
      mintLimitDaily: '10.00000000',
      mintLimit: '20.00000000'
    }])

    await alice.rpc.token.mintTokens(`1@${symbolBTC}`)
    await alice.generate(1)

    await alice.rpc.token.mintTokens(`2@${symbolETH}`)
    await alice.generate(1)

    await alice.rpc.token.burnTokens(`1@${symbolETH}`, accountAlice)
    await alice.generate(1)
    await tGroup.waitForSync()

    await bob.rpc.token.mintTokens(`4@${symbolBTC}`)
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
    await expect(client.consortium.getTransactionHistory(0, 51)).rejects.toThrow('InvalidLimit')
    await expect(client.consortium.getTransactionHistory(0, 0)).rejects.toThrow('InvalidLimit')
  })

  it('should throw an error if the search term is invalid', async () => {
    await expect(client.consortium.getTransactionHistory(1, 10, 'a')).rejects.toThrow('InvalidSearchTerm')
    await expect(client.consortium.getTransactionHistory(1, 10, 'a'.repeat(65))).rejects.toThrow('InvalidSearchTerm')
  })

  it('should throw an error if the pageIndex is invalid', async () => {
    await expect(client.consortium.getTransactionHistory(-1, 10)).rejects.toThrow('InvalidPageIndex')
  })

  it('should filter transactions with search term (member name)', async () => {
    const info = await client.consortium.getTransactionHistory(0, 10, 'alice')

    expect(info.transactions.length).toStrictEqual(3)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 111 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '2.00000000' }], address: accountAlice, block: 110 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dBTC', amount: '1.00000000' }], address: accountAlice, block: 109 }
    ])
    expect(info.total).toStrictEqual(3)
  })

  it('should filter transactions with search term (owner address)', async () => {
    const info = await client.consortium.getTransactionHistory(0, 10, accountAlice)

    expect(info.transactions.length).toStrictEqual(3)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 111 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '2.00000000' }], address: accountAlice, block: 110 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dBTC', amount: '1.00000000' }], address: accountAlice, block: 109 }
    ])
    expect(info.total).toStrictEqual(3)
  })

  it('should filter transactions with search term (transaction id)', async () => {
    const tx = (await alice.rpc.account.listAccountHistory(accountAlice))[0]

    const info = await client.consortium.getTransactionHistory(0, 10, tx.txid)

    expect(info.transactions.length).toStrictEqual(1)
    expect(info.transactions).toStrictEqual([
      { txId: tx.txid, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 111 }
    ])
    expect(info.total).toStrictEqual(1)
  })

  it('should limit transactions', async () => {
    const info = await client.consortium.getTransactionHistory(0, 3)

    expect(info.transactions.length).toStrictEqual(3)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'bob', tokenAmounts: [{ token: 'dBTC', amount: '-2.00000000' }], address: accountBob, block: 113 },
      { txId: txIdMatcher, type: 'Mint', member: 'bob', tokenAmounts: [{ token: 'dBTC', amount: '4.00000000' }], address: accountBob, block: 112 },
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 111 }
    ])
    expect(info.total).toStrictEqual(5)
  })

  it('should filter and limit transactions at the same time', async () => {
    const info = await client.consortium.getTransactionHistory(0, 2, accountAlice)

    expect(info.transactions.length).toStrictEqual(2)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 111 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '2.00000000' }], address: accountAlice, block: 110 }
    ])
    expect(info.total).toStrictEqual(3)
  })

  it('should return empty list of transactions for not-found search term', async () => {
    const info = await client.consortium.getTransactionHistory(0, 10, 'not-found-term')

    expect(info.transactions.length).toStrictEqual(0)
    expect(info.total).toStrictEqual(0)
  })

  it('should not return other transactions from consortium members apart from mints or burns', async () => {
    const { txid } = await alice.container.fundAddress(accountBob, 10)

    const info = await client.consortium.getTransactionHistory(0, 20, txid)

    expect(info.transactions.length).toStrictEqual(0)
    expect(info.total).toStrictEqual(0)
  })

  it('should paginate properly', async () => {
    const page1 = await client.consortium.getTransactionHistory(0, 2)

    expect(page1).toStrictEqual({
      transactions: [
        {
          type: 'Burn',
          member: 'bob',
          tokenAmounts: [{ token: 'dBTC', amount: '-2.00000000' }],
          txId: txIdMatcher,
          address: accountBob,
          block: 113
        },
        {
          type: 'Mint',
          member: 'bob',
          tokenAmounts: [{ token: 'dBTC', amount: '4.00000000' }],
          txId: txIdMatcher,
          address: accountBob,
          block: 112
        }
      ],
      total: 5
    })

    const page2 = await client.consortium.getTransactionHistory(1, 2)

    expect(page2).toStrictEqual({
      transactions: [
        {
          type: 'Burn',
          member: 'alice',
          tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }],
          txId: txIdMatcher,
          address: accountAlice,
          block: 111
        },
        {
          type: 'Mint',
          member: 'alice',
          tokenAmounts: [{ token: 'dETH', amount: '2.00000000' }],
          txId: txIdMatcher,
          address: accountAlice,
          block: 110
        }
      ],
      total: 5
    })

    const page3 = await client.consortium.getTransactionHistory(2, 2)

    expect(page3).toStrictEqual({
      transactions: [
        {
          type: 'Mint',
          member: 'alice',
          tokenAmounts: [{ token: 'dBTC', amount: '1.00000000' }],
          txId: txIdMatcher,
          address: accountAlice,
          block: 109
        }
      ],
      total: 5
    })
  })
})
