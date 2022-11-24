import { StubWhaleApiClient } from '../stub.client'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { StubService } from '../stub.service'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../../../../apps/whale-api/src/e2e.module'

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

  beforeAll(async () => {
    await tGroup.start()
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
  }

  async function setMemberInfo (tokenId: string, memberInfo: Array<{ id: string, name: string, backingId: string, ownerAddress: string, mintLimit: string, dailyMintLimit: string }>): Promise<void> {
    const infoObjs = memberInfo.map(mi => `
            "${mi.id}":{
            "name":"${mi.name}", 
            "ownerAddress":"${mi.ownerAddress}",
            "backingId":"${mi.backingId}",
            "dailyMintLimit":${mi.dailyMintLimit},
            "mintLimit":${mi.mintLimit}
        }`)

    return await setGovAttr({ [`v0/consortium/${tokenId}/members`]: `{${infoObjs.join(',')}}` })
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
      backingId: 'lmn,opq',
      dailyMintLimit: '10.00000000',
      mintLimit: '20.00000000'
    }])

    await alice.rpc.token.mintTokens(`1@${symbolBTC}`)
    await alice.generate(5)

    await alice.rpc.token.mintTokens(`2@${symbolETH}`)
    await alice.generate(5)

    await alice.rpc.token.burnTokens(`1@${symbolETH}`, accountAlice)
    await alice.generate(5)

    await bob.rpc.token.mintTokens(`4@${symbolBTC}`)
    await bob.generate(5)

    await bob.rpc.token.burnTokens(`2@${symbolBTC}`, accountBob)
    await bob.generate(5)

    const height = await alice.container.getBlockCount()
    await alice.generate(1)
    await waitForIndexedHeight(app, height)
  }

  it('should throw an error if the limit is invalid', async () => {
    await expect(client.consortium.getTransactionHistory(51)).rejects.toThrow('InvalidLimit')
    await expect(client.consortium.getTransactionHistory(0)).rejects.toThrow('InvalidLimit')
  })

  it('should throw an error if the search term is invalid', async () => {
    await expect(client.consortium.getTransactionHistory(1, 'a')).rejects.toThrow('InvalidSearchTerm')
    await expect(client.consortium.getTransactionHistory(1, 'a'.repeat(65))).rejects.toThrow('InvalidSearchTerm')
  })

  it('should throw an error if the max block height is invalid', async () => {
    await expect(client.consortium.getTransactionHistory(1, undefined, -2)).rejects.toThrow('InvalidMaxBlockHeight')
  })

  it('should filter transactions with search term (member name)', async () => {
    const info = await client.consortium.getTransactionHistory(10, 'alice')

    expect(info.transactions.length).toStrictEqual(3)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 119 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '2.00000000' }], address: accountAlice, block: 114 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dBTC', amount: '1.00000000' }], address: accountAlice, block: 109 }
    ])
    expect(info.total).toStrictEqual(3)
  })

  it('should filter transactions with search term (owner address)', async () => {
    const info = await client.consortium.getTransactionHistory(20, accountAlice)

    expect(info.transactions.length).toStrictEqual(3)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 119 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '2.00000000' }], address: accountAlice, block: 114 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dBTC', amount: '1.00000000' }], address: accountAlice, block: 109 }
    ])
    expect(info.total).toStrictEqual(3)
  })

  it('should filter transactions with search term (transaction id)', async () => {
    const tx = (await alice.rpc.account.listAccountHistory(accountAlice))[0]

    const info = await client.consortium.getTransactionHistory(20, tx.txid)

    expect(info.transactions.length).toStrictEqual(1)
    expect(info.transactions).toStrictEqual([
      { txId: tx.txid, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 119 }
    ])
    expect(info.total).toStrictEqual(1)
  })

  it('should limit transactions', async () => {
    const info = await client.consortium.getTransactionHistory(3)

    expect(info.transactions.length).toStrictEqual(3)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'bob', tokenAmounts: [{ token: 'dBTC', amount: '-2.00000000' }], address: accountBob, block: 129 },
      { txId: txIdMatcher, type: 'Mint', member: 'bob', tokenAmounts: [{ token: 'dBTC', amount: '4.00000000' }], address: accountBob, block: 124 },
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 119 }
    ])
    expect(info.total).toStrictEqual(5)
  })

  it('should filter and limit transactions at the same time', async () => {
    const info = await client.consortium.getTransactionHistory(2, accountAlice)

    expect(info.transactions.length).toStrictEqual(2)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 119 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '2.00000000' }], address: accountAlice, block: 114 }
    ])
    expect(info.total).toStrictEqual(3)
  })

  it('should get transactions upto a specific block height with a limit', async () => {
    const info = await client.consortium.getTransactionHistory(3, undefined, 124)

    expect(info.transactions.length).toStrictEqual(3)
    expect(info.transactions).toStrictEqual([
      { txId: txIdMatcher, type: 'Mint', member: 'bob', tokenAmounts: [{ token: 'dBTC', amount: '4.00000000' }], address: accountBob, block: 124 },
      { txId: txIdMatcher, type: 'Burn', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }], address: accountAlice, block: 119 },
      { txId: txIdMatcher, type: 'Mint', member: 'alice', tokenAmounts: [{ token: 'dETH', amount: '2.00000000' }], address: accountAlice, block: 114 }
    ])
    expect(info.total).toStrictEqual(5)
  })

  it('should return empty list of transactions for invalid search term', async () => {
    const info = await client.consortium.getTransactionHistory(20, 'invalid-term')

    expect(info.transactions.length).toStrictEqual(0)
    expect(info.total).toStrictEqual(0)
  })

  it('should not return other transactions from consortium members apart from mints or burns', async () => {
    const { txid } = await alice.container.fundAddress(accountBob, 10)

    const info = await client.consortium.getTransactionHistory(20, txid)

    expect(info.transactions.length).toStrictEqual(0)
    expect(info.total).toStrictEqual(0)
  })

  it('should paginate properly', async () => {
    const page1 = await client.consortium.getTransactionHistory(2, undefined, -1)

    expect(page1).toStrictEqual({
      transactions: [
        {
          type: 'Burn',
          member: 'bob',
          tokenAmounts: [{ token: 'dBTC', amount: '-2.00000000' }],
          txId: txIdMatcher,
          address: accountBob,
          block: 129
        },
        {
          type: 'Mint',
          member: 'bob',
          tokenAmounts: [{ token: 'dBTC', amount: '4.00000000' }],
          txId: txIdMatcher,
          address: accountBob,
          block: 124
        }
      ],
      total: 5
    })

    const page2 = await client.consortium.getTransactionHistory(2, undefined, page1.transactions[page1.transactions.length - 1].block - 1)

    expect(page2).toStrictEqual({
      transactions: [
        {
          type: 'Burn',
          member: 'alice',
          tokenAmounts: [{ token: 'dETH', amount: '-1.00000000' }],
          txId: txIdMatcher,
          address: accountAlice,
          block: 119
        },
        {
          type: 'Mint',
          member: 'alice',
          tokenAmounts: [{ token: 'dETH', amount: '2.00000000' }],
          txId: txIdMatcher,
          address: accountAlice,
          block: 114
        }
      ],
      total: 5
    })

    const page3 = await client.consortium.getTransactionHistory(2, undefined, page2.transactions[page2.transactions.length - 1].block - 1)

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
