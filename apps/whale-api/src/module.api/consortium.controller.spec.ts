import sinon from 'sinon'
import { ConsortiumController } from './consortium.controller'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { createTestingApp, stopTestingApp } from '../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { GlobalCache } from '@defichain-apps/libs/caches'

describe('getAssetBreakdown', () => {
  const tGroup = TestingGroup.create(2)
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  const symbolBTC = 'dBTC'
  const symbolETH = 'dETH'
  let accountAlice: string, accountBob: string
  let idBTC: string
  let idETH: string
  let app: NestFastifyApplication
  let controller: ConsortiumController
  let globalCacheGetStub: sinon.SinonStub

  beforeAll(async () => {
    await tGroup.start()
    await alice.container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(alice.container)
    controller = app.get(ConsortiumController)

    globalCacheGetStub = sinon.stub(GlobalCache.prototype, 'get')
    globalCacheGetStub.callsFake((prefix, id, fetch) => {
      return fetch()
    })
  })

  afterAll(async () => {
    await stopTestingApp(tGroup, app)
    globalCacheGetStub.restore()
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
      }`
    )

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
      backingId: ' lmn ,    opq',
      dailyMintLimit: '10.00000000',
      mintLimit: '20.00000000'
    }])

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
  }

  it('should return an empty list if theres no consortium members or tokens initialized', async () => {
    const info = await controller.getAssetBreakdown()
    expect(info).toStrictEqual([])
  })

  it('should return list of valid asset breakdown information', async () => {
    await setup()

    const info = await controller.getAssetBreakdown()
    expect(info).toStrictEqual([{
      tokenSymbol: symbolBTC,
      memberInfo: [
        { id: '01', name: 'alice', minted: '1.00000000', burned: '0.00000000', backingAddresses: ['abc'], tokenId: idBTC },
        { id: '02', name: 'bob', minted: '4.00000000', burned: '2.00000000', backingAddresses: ['def', 'hij'], tokenId: idBTC }
      ]
    }, {
      tokenSymbol: symbolETH,
      memberInfo: [
        { id: '01', name: 'alice', minted: '2.00000000', burned: '1.00000000', backingAddresses: [], tokenId: idETH },
        { id: '02', name: 'bob', minted: '0.00000000', burned: '0.00000000', backingAddresses: ['lmn', 'opq'], tokenId: idETH }
      ]
    }])
  })
})
