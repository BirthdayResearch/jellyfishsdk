import { ConsortiumController } from './consortium.controller'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { createTestingApp, stopTestingApp } from '../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { StartFlags } from '@defichain/testcontainers'

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

beforeEach(async () => {
  await tGroup.start({ startFlags })
  await alice.container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(alice.container)
  controller = app.get(ConsortiumController)
})

afterEach(async () => {
  await stopTestingApp(tGroup, app)
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

describe('getAssetBreakdown', () => {
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

describe('getMemberMintStats', () => {
  it('should throw an error if given consortium member id does not exists', async () => {
    await setup()

    const promise = controller.getMemberMintStats('01234')
    await expect(promise).rejects.toThrow(Error)
    await expect(promise).rejects.toThrow('Consortium member not found')
  })

  it('should return mint limits and minted amounts set to 0 if the mint transaction does not exists', async () => {
    await setup()

    const stats = await controller.getMemberMintStats('01')
    expect(stats).toStrictEqual(
      {
        memberId: '01',
        memberName: 'alice',
        mintTokens: [
          { tokenSymbol: symbolBTC, tokenDisplaySymbol: `d${symbolBTC}`, tokenId: '1', minted: '0.00000000', mintedDaily: '0.00000000', mintLimit: '10.00000000', mintDailyLimit: '5.00000000' },
          { tokenSymbol: symbolETH, tokenDisplaySymbol: `d${symbolETH}`, tokenId: '2', minted: '0.00000000', mintedDaily: '0.00000000', mintLimit: '20.00000000', mintDailyLimit: '10.00000000' }
        ]
      })
  })

  it('should return complete mint stats of the member', async () => {
    await setup()

    await bob.rpc.token.mintTokens(`1.5@${symbolBTC}`)
    await bob.generate(1)

    await bob.rpc.token.mintTokens(`3@${symbolETH}`)
    await bob.generate(1)

    await tGroup.waitForSync()

    const stats = await controller.getMemberMintStats('01')
    expect(stats).toStrictEqual(
      {
        memberId: '01',
        memberName: 'alice',
        mintTokens: [
          { tokenSymbol: symbolBTC, tokenDisplaySymbol: `d${symbolBTC}`, tokenId: '1', minted: '1.50000000', mintedDaily: '1.50000000', mintLimit: '10.00000000', mintDailyLimit: '5.00000000' },
          { tokenSymbol: symbolETH, tokenDisplaySymbol: `d${symbolETH}`, tokenId: '2', minted: '3.00000000', mintedDaily: '3.00000000', mintLimit: '20.00000000', mintDailyLimit: '10.00000000' }
        ]
      })
  })
})
