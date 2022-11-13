import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BigNumber, RpcApiError } from '../../../src'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('Token', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await container.stop()
  })

  let from: string

  async function setup (): Promise<void> {
    from = await container.getNewAddress()

    await createToken(from, 'DBTC')
    await container.generate(1)

    await createToken(from, 'DETH')
    await container.generate(1)
  }

  async function createToken (address: string, symbol: string): Promise<void> {
    const defaultMetadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await client.token.createToken({ ...defaultMetadata })
  }

  it('should mintTokens', async () => {
    let tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(0)

    const data = await client.token.mintTokens('5@DBTC')

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(1)
    expect(tokenBalances[0]).toStrictEqual('5.00000000@1')
  })

  it('should not mintTokens for non-existence token', async () => {
    const promise = client.token.mintTokens('5@ETH')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: ETH\', code: 0, method: minttokens')
  })

  it('should mintTokens with utxos', async () => {
    let tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(1)

    const { txid, vout } = await container.fundAddress(from, 10)

    const data = await client.token.mintTokens('5@DETH', [{ txid, vout }])

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(2)
    expect(tokenBalances[1]).toStrictEqual('5.00000000@2')
  })
})

describe('Consortium', () => {
  const tGroup = TestingGroup.create(4)
  let account0: string, account1: string, account2: string, account3: string
  let idBTC: string, idDOGE: string
  const symbolBTC = 'BTC'
  const symbolDOGE = 'DOGE'
  const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest

  beforeAll(async () => {
    await tGroup.start()

    account0 = await tGroup.get(0).generateAddress()
    account1 = await tGroup.get(1).generateAddress()
    account2 = await tGroup.get(2).generateAddress()
    account3 = await tGroup.get(3).generateAddress()

    await tGroup.get(0).token.create({
      symbol: symbolBTC,
      name: symbolBTC,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: account0
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).token.create({
      symbol: symbolDOGE,
      name: symbolDOGE,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: account0
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.fundAddress(account0, 10)
    await tGroup.get(0).container.fundAddress(account1, 10)
    await tGroup.get(0).container.fundAddress(account2, 10)
    await tGroup.get(0).container.fundAddress(account3, 10)

    await tGroup.get(0).generate(1)

    idBTC = await tGroup.get(0).token.getTokenId(symbolBTC)
    idDOGE = await tGroup.get(0).token.getTokenId(symbolDOGE)

    // Move to grand central height
    await tGroup.get(0).container.generate(150 - await tGroup.get(0).container.getBlockCount())
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setGovAttr (ATTRIBUTES: object): Promise<void> {
    const hash = await tGroup.get(0).rpc.masternode.setGov({ ATTRIBUTES })
    expect(hash).toBeTruthy()
    await tGroup.get(0).generate(1)
  }

  async function setMemberInfo (tokenId: string, memberInfo: Array<{ id: string, name: string, ownerAddress: string, mintLimit: string, dailyMintLimit: string }>): Promise<void> {
    const infoObjs = memberInfo.map(mi => `
      "${mi.id}":{
        "name":"${mi.name}", 
        "ownerAddress":"${mi.ownerAddress}",
        "backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf",
        "dailyMintLimit":${mi.dailyMintLimit},
        "mintLimit":${mi.mintLimit}
      }`
    )

    return await setGovAttr({ [`v0/consortium/${tokenId}/members`]: `{${infoObjs.join(',')}}` })
  }

  it('should throw an error if foundation or consortium member authorization is not present', async () => {
    await expect(tGroup.get(2).rpc.token.mintTokens(`1@${symbolBTC}`)).rejects.toThrow('Need foundation or consortium member authorization')
    await expect(tGroup.get(3).rpc.token.mintTokens(`1@${symbolBTC}`)).rejects.toThrow('Need foundation or consortium member authorization')
    await expect(tGroup.get(2).rpc.token.mintTokens(`1@${symbolDOGE}`)).rejects.toThrow('Need foundation or consortium member authorization')
    await expect(tGroup.get(3).rpc.token.mintTokens(`1@${symbolDOGE}`)).rejects.toThrow('Need foundation or consortium member authorization')
  })

  it('should throw an error if the token is not specified in governance vars', async () => {
    // Enable consortium
    await setGovAttr({ 'v0/params/feature/consortium': 'true' })

    // Set global consortium mint limit for BTC
    await setGovAttr({
      [`v0/consortium/${idBTC}/mint_limit`]: '10',
      [`v0/consortium/${idBTC}/mint_limit_daily`]: '5'
    })

    // Set consortium members for BTC
    await setMemberInfo(idBTC, [{
      id: '01',
      name: 'account1BTC',
      ownerAddress: account1,
      dailyMintLimit: '5.00000000',
      mintLimit: '10.00000000'
    }, {
      id: '02',
      name: 'account2BTC',
      ownerAddress: account2,
      dailyMintLimit: '5.00000000',
      mintLimit: '10.00000000'
    }, {
      id: '03',
      name: 'account3BTC',
      ownerAddress: account3,
      dailyMintLimit: '5.00000000',
      mintLimit: '10.00000000'
    }])

    // Trying to mint DOGE
    await expect(tGroup.get(2).rpc.token.mintTokens(`1@${symbolDOGE}`)).rejects.toThrow('Need foundation or consortium member authorization')
  })

  it('should throw an error if member daily mint limit exceeds', async () => {
    await expect(tGroup.get(2).rpc.token.mintTokens(`6@${symbolBTC}`)).rejects.toThrow(`RpcApiError: 'Test MintTokenTx execution failed:\nYou will exceed your daily mint limit for ${symbolBTC} token by minting this amount', code: -32600, method: minttokens`)
  })

  it('should throw an error if member maximum mint limit exceeds', async () => {
    await expect(tGroup.get(2).rpc.token.mintTokens(`11@${symbolBTC}`)).rejects.toThrow(`RpcApiError: 'Test MintTokenTx execution failed:\nYou will exceed your maximum mint limit for ${symbolBTC} token by minting this amount!', code: -32600, method: minttokens`)
  })

  it('should throw an error if global daily mint limit exceeds', async () => {
    // Hit global daily mint limit
    await tGroup.get(1).rpc.token.mintTokens(`5.0000000@${symbolBTC}`)
    await tGroup.get(1).generate(5)

    await expect(tGroup.get(3).rpc.token.mintTokens(`1.00000000@${symbolBTC}`)).rejects.toThrow(`RpcApiError: 'Test MintTokenTx execution failed:\nYou will exceed global daily maximum consortium mint limit for ${symbolBTC} token by minting this amount.', code: -32600, method: minttokens`)
  })

  it('should throw an error if global mint limit exceeds', async () => {
    // Move to next day
    await tGroup.get(1).generate(blocksPerDay)

    // Hit global mint limit
    await tGroup.get(1).rpc.token.mintTokens(`5.0000000@${symbolBTC}`)
    await tGroup.get(1).generate(5)

    await expect(tGroup.get(3).rpc.token.mintTokens(`1.00000000@${symbolBTC}`)).rejects.toThrow(`RpcApiError: 'Test MintTokenTx execution failed:\nYou will exceed global maximum consortium mint limit for ${symbolBTC} token by minting this amount!', code: -32600, method: minttokens`)
  })

  it('should be able to mint tokens', async () => {
    // Move to next day
    await tGroup.get(1).generate(blocksPerDay)

    await tGroup.get(1).rpc.token.burnTokens(`10.0000000@${symbolBTC}`, account1)

    await tGroup.get(1).generate(1)

    await setGovAttr({
      [`v0/consortium/${idBTC}/mint_limit`]: '20'
    })

    const hash = await tGroup.get(2).rpc.token.mintTokens(`1@${symbolBTC}`)
    expect(hash).toBeTruthy()
    await tGroup.get(2).generate(1)

    expect((await tGroup.get(2).rpc.account.getAccount(account2))[0]).toStrictEqual(`1.00000000@${symbolBTC}`)

    // Check global consortium attributes
    const attr = (await tGroup.get(2).rpc.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    expect(attr[`v0/live/economy/consortium/${idBTC}/minted`]).toStrictEqual(new BigNumber('11'))
    expect(attr[`v0/live/economy/consortium/${idBTC}/burnt`]).toStrictEqual(new BigNumber('10'))
    expect(attr[`v0/live/economy/consortium/${idBTC}/supply`]).toStrictEqual(new BigNumber('1'))
  })

  it('should return correct governance attribute values', async () => {
    // Set global mint limits for DOGE
    await setGovAttr({
      [`v0/consortium/${idDOGE}/mint_limit`]: '6',
      [`v0/consortium/${idDOGE}/mint_limit_daily`]: '6'
    })

    // Add consortium members for DOGE
    await setGovAttr({
      [`v0/consortium/${idDOGE}/members`]: `{
        "01": {
          "name":"account1DOGE",
          "ownerAddress":"${account1}",
          "backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf",
          "dailyMintLimit":2.00000000,
          "mintLimit":5.00000000
        },
        "02": {
          "name":"account2DOGE",
          "ownerAddress":"${account2}",
          "backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf",
          "dailyMintLimit":2.00000000,
          "mintLimit":5.00000000
        }
      }`
    })

    const attr0 = (await tGroup.get(0).rpc.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    expect(attr0[`v0/consortium/${idBTC}/members`]).toStrictEqual(`{"01":{"name":"account1BTC","ownerAddress":"${account1}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":10.00000000,"dailyMintLimit":5.00000000,"status":0},"02":{"name":"account2BTC","ownerAddress":"${account2}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":10.00000000,"dailyMintLimit":5.00000000,"status":0},"03":{"name":"account3BTC","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":10.00000000,"dailyMintLimit":5.00000000,"status":0}}`)
    expect(attr0[`v0/consortium/${idBTC}/mint_limit`]).toStrictEqual('20')
    expect(attr0[`v0/consortium/${idBTC}/mint_limit_daily`]).toStrictEqual('5')

    expect(attr0[`v0/consortium/${idDOGE}/members`]).toStrictEqual(`{"01":{"name":"account1DOGE","ownerAddress":"${account1}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":5.00000000,"dailyMintLimit":2.00000000,"status":0},"02":{"name":"account2DOGE","ownerAddress":"${account2}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":5.00000000,"dailyMintLimit":2.00000000,"status":0}}`)
    expect(attr0[`v0/consortium/${idDOGE}/mint_limit`]).toStrictEqual('6')
    expect(attr0[`v0/consortium/${idDOGE}/mint_limit_daily`]).toStrictEqual('6')

    const hash = await tGroup.get(2).rpc.token.mintTokens(`2@${symbolDOGE}`)
    expect(hash).toBeTruthy()
    await tGroup.get(2).generate(5)

    expect((await tGroup.get(2).rpc.account.getAccount(account2))).toStrictEqual([
      `1.00000000@${symbolBTC}`,
      `2.00000000@${symbolDOGE}`
    ])

    const attr2 = (await tGroup.get(2).rpc.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    expect(attr2[`v0/live/economy/consortium/${idBTC}/minted`]).toStrictEqual(new BigNumber(11))
    expect(attr2[`v0/live/economy/consortium/${idBTC}/burnt`]).toStrictEqual(new BigNumber(10))
    expect(attr2[`v0/live/economy/consortium/${idBTC}/supply`]).toStrictEqual(new BigNumber(1))
    expect(attr2[`v0/live/economy/consortium_members/${idBTC}/01/minted`]).toStrictEqual(new BigNumber(10))
    expect(attr2[`v0/live/economy/consortium_members/${idBTC}/01/daily_minted`]).toStrictEqual('288/5.00000000')
    expect(attr2[`v0/live/economy/consortium_members/${idBTC}/01/burnt`]).toStrictEqual(new BigNumber(10))
    expect(attr2[`v0/live/economy/consortium_members/${idBTC}/01/supply`]).toStrictEqual(new BigNumber(0))
    expect(attr2[`v0/live/economy/consortium_members/${idBTC}/02/minted`]).toStrictEqual(new BigNumber(1))
    expect(attr2[`v0/live/economy/consortium_members/${idBTC}/02/daily_minted`]).toStrictEqual('432/1.00000000')
    expect(attr2[`v0/live/economy/consortium_members/${idBTC}/02/burnt`]).toStrictEqual(new BigNumber(0))
    expect(attr2[`v0/live/economy/consortium_members/${idBTC}/02/supply`]).toStrictEqual(new BigNumber(1))

    expect(attr2[`v0/live/economy/consortium/${idDOGE}/minted`]).toStrictEqual(new BigNumber(2))
    expect(attr2[`v0/live/economy/consortium/${idDOGE}/burnt`]).toStrictEqual(new BigNumber(0))
    expect(attr2[`v0/live/economy/consortium/${idDOGE}/supply`]).toStrictEqual(new BigNumber(2))
    expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/02/minted`]).toStrictEqual(new BigNumber(2))
    expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/02/daily_minted`]).toStrictEqual('432/2.00000000')
    expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/02/burnt`]).toStrictEqual(new BigNumber(0))
    expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/02/supply`]).toStrictEqual(new BigNumber(2))
  })

  it('should throw an error if tried to mint a token while not being an active member of the consortium', async () => {
    await setGovAttr({
      [`v0/consortium/${idDOGE}/members`]: `{
        "01": {
          "name":"account1DOGE",
          "ownerAddress":"${account1}",
          "backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf",
          "dailyMintLimit":2.00000000,
          "mintLimit":5.00000000,
          "status":1
        }
      }`
    })

    await expect(tGroup.get(1).rpc.token.mintTokens(`1@${symbolDOGE}`)).rejects.toThrow(`Cannot mint token, not an active member of consortium for ${symbolDOGE}!`)
  })
})
