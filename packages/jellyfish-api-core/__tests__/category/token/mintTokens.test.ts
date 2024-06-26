import { MasterNodeRegTestContainer, StartFlags } from '@defichain/testcontainers'
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

    const data = await client.token.mintTokens({ amounts: ['5@DBTC'] })

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(1)
    expect(tokenBalances[0]).toStrictEqual('5.00000000@1')
  })

  it('should mintTokens to an address', async () => {
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/mint-tokens-to-address': 'true' } })
    await container.generate(1)

    const toAddress = await container.getNewAddress()
    const data = await client.token.mintTokens({ amounts: ['5@DBTC'], to: toAddress })

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    const tokenBalances = await client.account.getAccount(toAddress)

    expect(tokenBalances.length).toStrictEqual(1)
    expect(tokenBalances[0]).toStrictEqual('5.00000000@DBTC')
  })

  it('should not mintTokens for non-existence token', async () => {
    const promise = client.token.mintTokens({ amounts: ['5@ETH'] })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: ETH\', code: 0, method: minttokens')
  })

  it('should mintTokens with utxos', async () => {
    let tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(1)

    const {
      txid,
      vout
    } = await container.fundAddress(from, 10)

    const data = await client.token.mintTokens({
      amounts: ['5@DETH'],
      utxos: [{
        txid,
        vout
      }]
    })

    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)

    await container.generate(1)

    tokenBalances = await client.account.getTokenBalances()

    expect(tokenBalances.length).toStrictEqual(2)
    expect(tokenBalances[1]).toStrictEqual('5.00000000@2')
  })

  it('should throw error if invalid to address', async () => {
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/mint-tokens-to-address': 'true' } })
    await container.generate(1)

    const toAddress = await container.getNewAddress()
    const promise = client.token.mintTokens({
      amounts: ['5@DBTC'],
      to: toAddress.substr(0, 7)
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: `recipient (${toAddress.substr(0, 7)}) does not refer to any valid address`,
        method: 'minttokens'
      }
    })
  })
})

// NOTE(canonbrother): skip as consortium is removed, ref: https://github.com/DeFiCh/ain/pull/2730
describe.skip('Consortium', () => {
  const tGroup = TestingGroup.create(4)
  let account0: string, account1: string, account2: string, account3: string
  let idBTC: string
  // let idDOGE: string
  const symbolBTC = 'BTC'
  const symbolDOGE = 'DOGE'
  const startFlags: StartFlags[] = [{ name: 'regtest-minttoken-simulate-mainnet', value: 1 }]

  beforeEach(async () => {
    await tGroup.start({ startFlags })

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
    // idDOGE = await tGroup.get(0).token.getTokenId(symbolDOGE)

    // // Enable consortium
    // await setGovAttr({ 'v0/params/feature/consortium': 'true' })
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  // async function setGovAttr (attributes: object): Promise<void> {
  //   const hash = await tGroup.get(0).rpc.masternode.setGov({ ATTRIBUTES: attributes })
  //   expect(hash).toBeTruthy()
  //   await tGroup.get(0).generate(1)
  //   await tGroup.waitForSync()
  // }

  it('should throw an error if foundation or consortium member authorization is not present', async () => {
    const errorMsg = 'RpcApiError: \'Test MintTokenTx execution failed:\nYou are not a foundation member or token owner and cannot mint this token!\', code: -32600, method: minttokens'
    await expect(tGroup.get(2).rpc.token.mintTokens({ amounts: [`1@${symbolBTC}`] })).rejects.toThrow(errorMsg)
    await expect(tGroup.get(3).rpc.token.mintTokens({ amounts: [`1@${symbolBTC}`] })).rejects.toThrow(errorMsg)
    await expect(tGroup.get(2).rpc.token.mintTokens({ amounts: [`1@${symbolDOGE}`] })).rejects.toThrow(errorMsg)
    await expect(tGroup.get(3).rpc.token.mintTokens({ amounts: [`1@${symbolDOGE}`] })).rejects.toThrow(errorMsg)
  })

  it('should throw an error if the token is not specified in governance vars', async () => {
    // Set consortium members 02 for BTC
    // await setGovAttr({
    //   [`v0/consortium/${idBTC}/mint_limit`]: '10',
    //   [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',
    //   [`v0/consortium/${idBTC}/members`]: {
    //     '02': {
    //       name: 'account2BTC',
    //       ownerAddress: account2,
    //       mintLimitDaily: 5,
    //       mintLimit: 10,
    //       backingId: 'backing2'
    //     }
    //   }
    // })

    // Member 02 trying to mint DOGE
    await expect(tGroup.get(2).rpc.token.mintTokens({ amounts: [`1@${symbolDOGE}`] })).rejects.toThrow('RpcApiError: \'Test MintTokenTx execution failed:\nYou are not a foundation member or token owner and cannot mint this token!\', code: -32600, method: minttokens')
  })

  it('should throw an error if member daily mint limit exceeds', async () => {
    // await setGovAttr({
    //   [`v0/consortium/${idBTC}/mint_limit`]: '10',
    //   [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',
    //   [`v0/consortium/${idBTC}/members`]: {
    //     '02': {
    //       name: 'account2BTC',
    //       ownerAddress: account2,
    //       mintLimitDaily: 5,
    //       mintLimit: 10,
    //       backingId: 'backing2'
    //     }
    //   }
    // })

    await expect(tGroup.get(2).rpc.token.mintTokens({ amounts: [`6@${symbolBTC}`] })).rejects.toThrow(`RpcApiError: 'Test MintTokenTx execution failed:\nYou will exceed your daily mint limit for ${symbolBTC} token by minting this amount', code: -32600, method: minttokens`)
  })

  it('should throw an error if member maximum mint limit exceeds', async () => {
    // await setGovAttr({
    //   [`v0/consortium/${idBTC}/mint_limit`]: '10',
    //   [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',
    //   [`v0/consortium/${idBTC}/members`]: {
    //     '02': {
    //       name: 'account2BTC',
    //       ownerAddress: account2,
    //       mintLimitDaily: 5,
    //       mintLimit: 10,
    //       backingId: 'backing2'
    //     }
    //   }
    // })

    await expect(tGroup.get(2).rpc.token.mintTokens({ amounts: [`11@${symbolBTC}`] })).rejects.toThrow(`RpcApiError: 'Test MintTokenTx execution failed:\nYou will exceed your maximum mint limit for ${symbolBTC} token by minting this amount!', code: -32600, method: minttokens`)
  })

  it('should throw an error if global daily mint limit exceeds', async () => {
    // await setGovAttr({
    //   [`v0/consortium/${idBTC}/mint_limit`]: '10',
    //   [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',
    //   [`v0/consortium/${idBTC}/members`]: {
    //     '01': {
    //       id: '01',
    //       name: 'account1BTC',
    //       ownerAddress: account1,
    //       mintLimitDaily: 5,
    //       mintLimit: 10,
    //       backingId: 'backing1'
    //     },
    //     '03': {
    //       name: 'account3BTC',
    //       ownerAddress: account3,
    //       mintLimitDaily: 5,
    //       mintLimit: 10,
    //       backingId: 'backing3'
    //     }
    //   }
    // })

    // Hit global daily mint limit
    await tGroup.get(1).rpc.token.mintTokens({ amounts: [`5.0000000@${symbolBTC}`] })
    await tGroup.get(1).generate(1)
    await tGroup.waitForSync()

    await expect(tGroup.get(3).rpc.token.mintTokens({ amounts: [`1.00000000@${symbolBTC}`] })).rejects.toThrow(`RpcApiError: 'Test MintTokenTx execution failed:\nYou will exceed global daily maximum consortium mint limit for ${symbolBTC} token by minting this amount.', code: -32600, method: minttokens`)
  })

  it('should throw an error if global mint limit exceeds', async () => {
    // await setGovAttr({
    //   [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',
    //   [`v0/consortium/${idBTC}/mint_limit`]: '8',
    //   [`v0/consortium/${idBTC}/members`]: {
    //     '01': {
    //       id: '01',
    //       name: 'account1BTC',
    //       ownerAddress: account1,
    //       mintLimitDaily: 5,
    //       mintLimit: 8,
    //       backingId: 'backing1'
    //     },
    //     '03': {
    //       name: 'account3BTC',
    //       ownerAddress: account3,
    //       mintLimitDaily: 5,
    //       mintLimit: 8,
    //       backingId: 'backing3'
    //     }
    //   }
    // })

    // Hit global mint limit
    await tGroup.get(1).rpc.token.mintTokens({ amounts: [`5.0000000@${symbolBTC}`] })
    await tGroup.get(1).generate(1)
    await tGroup.waitForSync()

    await expect(tGroup.get(3).rpc.token.mintTokens({ amounts: [`5.00000000@${symbolBTC}`] })).rejects.toThrow(`RpcApiError: 'Test MintTokenTx execution failed:\nYou will exceed global maximum consortium mint limit for ${symbolBTC} token by minting this amount!', code: -32600, method: minttokens`)
  })

  it('should throw an error if tried to mint a token while not being an active member of the consortium', async () => {
    // await setGovAttr({
    //   [`v0/consortium/${idDOGE}/mint_limit`]: '10',
    //   [`v0/consortium/${idDOGE}/mint_limit_daily`]: '5',
    //   [`v0/consortium/${idDOGE}/members`]: {
    //     '01': {
    //       name: 'account1DOGE',
    //       ownerAddress: account1,
    //       backingId: 'backing1',
    //       mintLimitDaily: 2.00000000,
    //       mintLimit: 5.00000000,
    //       status: 1
    //     }
    //   }
    // })

    await expect(tGroup.get(1).rpc.token.mintTokens({ amounts: [`1@${symbolDOGE}`] })).rejects.toThrow(`Cannot mint token, not an active member of consortium for ${symbolDOGE}!`)
  })

  it('should be able to mint tokens', async () => {
    // await setGovAttr({
    //   [`v0/consortium/${idBTC}/mint_limit`]: '10',
    //   [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',
    //   [`v0/consortium/${idBTC}/members`]: {
    //     '02': {
    //       name: 'account2BTC',
    //       ownerAddress: account2,
    //       mintLimit: 10,
    //       mintLimitDaily: 5,
    //       backingId: 'backing2'
    //     }
    //   }
    // })

    const hash = await tGroup.get(2).rpc.token.mintTokens({ amounts: [`1@${symbolBTC}`] })
    expect(hash).toBeTruthy()
    await tGroup.get(2).generate(1)

    expect((await tGroup.get(2).rpc.account.getAccount(account2))[0]).toStrictEqual(`1.00000000@${symbolBTC}`)

    // Check global consortium attributes
    const attr = (await tGroup.get(2).rpc.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    expect(attr[`v0/live/economy/consortium/${idBTC}/minted`]).toStrictEqual(new BigNumber('1'))
    expect(attr[`v0/live/economy/consortium/${idBTC}/supply`]).toStrictEqual(new BigNumber('1'))
  })

  it('should be able to mint tokens to address', async () => {
    // await setGovAttr({
    //   'v0/params/feature/mint-tokens-to-address': 'true',
    //   [`v0/consortium/${idBTC}/mint_limit`]: '10',
    //   [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',
    //   [`v0/consortium/${idBTC}/members`]: {
    //     '02': {
    //       name: 'account2BTC',
    //       ownerAddress: account2,
    //       mintLimit: 10,
    //       mintLimitDaily: 5,
    //       backingId: 'backing2'
    //     }
    //   }
    // })

    const toAddress = await tGroup.get(2).generateAddress()

    const hash = await tGroup.get(2).rpc.token.mintTokens({ amounts: [`1@${symbolBTC}`], to: toAddress })
    expect(hash).toBeTruthy()
    await tGroup.get(2).generate(1)

    expect((await tGroup.get(2).rpc.account.getAccount(toAddress))[0]).toStrictEqual(`1.00000000@${symbolBTC}`)

    // Check global consortium attributes
    const attr = (await tGroup.get(2).rpc.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    expect(attr[`v0/live/economy/consortium/${idBTC}/minted`]).toStrictEqual(new BigNumber('1'))
    expect(attr[`v0/live/economy/consortium/${idBTC}/supply`]).toStrictEqual(new BigNumber('1'))
  })

  // it('should be able to set unlimited mint limits per member when global mint_limit or mint_limit_daily is set to -1', async () => {
  //   await setGovAttr({
  //     [`v0/consortium/${idBTC}/mint_limit_daily`]: '-1',
  //     [`v0/consortium/${idBTC}/mint_limit`]: '-1',
  //     [`v0/consortium/${idBTC}/members`]: {
  //       '01': {
  //         id: '01',
  //         name: 'account1BTC',
  //         ownerAddress: account1,
  //         mintLimitDaily: 10000000,
  //         mintLimit: 10000000,
  //         backingId: 'backing1'
  //       },
  //       '02': {
  //         name: 'account2BTC',
  //         ownerAddress: account2,
  //         mintLimitDaily: 50000000,
  //         mintLimit: 50000000,
  //         backingId: 'backing2'
  //       },
  //       '03': {
  //         name: 'account3BTC',
  //         ownerAddress: account3,
  //         mintLimitDaily: 50000000,
  //         mintLimit: 50000000,
  //         backingId: 'backing3'
  //       }
  //     }
  //   })
  // })

  // it('should return correct governance attribute values', async () => {
  //   await setGovAttr({
  //     [`v0/consortium/${idDOGE}/mint_limit`]: '100',
  //     [`v0/consortium/${idDOGE}/mint_limit_daily`]: '50',
  //     [`v0/consortium/${idBTC}/mint_limit`]: '20',
  //     [`v0/consortium/${idBTC}/mint_limit_daily`]: '10',
  //     [`v0/consortium/${idBTC}/members`]: {
  //       '01': {
  //         name: 'account1BTC',
  //         ownerAddress: account1,
  //         backingId: 'backing1',
  //         mintLimitDaily: 5.00000000,
  //         mintLimit: 10.00000000
  //       },
  //       '02': {
  //         name: 'account2BTC',
  //         ownerAddress: account2,
  //         backingId: 'backing2',
  //         mintLimitDaily: 5.00000000,
  //         mintLimit: 10.00000000
  //       }
  //     },
  //     [`v0/consortium/${idDOGE}/members`]: {
  //       '01': {
  //         name: 'account1DOGE',
  //         ownerAddress: account1,
  //         backingId: 'backing1',
  //         mintLimitDaily: 5.00000000,
  //         mintLimit: 10.00000000
  //       },
  //       '02': {
  //         name: 'account2DOGE',
  //         ownerAddress: account2,
  //         backingId: 'backing2',
  //         mintLimitDaily: 5.00000000,
  //         mintLimit: 10.00000000
  //       }
  //     }
  //   })

  //   const attr0 = (await tGroup.get(0).rpc.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
  //   expect(attr0[`v0/consortium/${idBTC}/members`]).toStrictEqual({
  //     '01': {
  //       name: 'account1BTC',
  //       ownerAddress: account1,
  //       backingId: 'backing1',
  //       mintLimit: new BigNumber(10),
  //       mintLimitDaily: new BigNumber(5),
  //       status: new BigNumber(0)
  //     },
  //     '02': {
  //       name: 'account2BTC',
  //       ownerAddress: account2,
  //       backingId: 'backing2',
  //       mintLimit: new BigNumber(10),
  //       mintLimitDaily: new BigNumber(5),
  //       status: new BigNumber(0)
  //     }
  //   })
  //   expect(attr0[`v0/consortium/${idBTC}/mint_limit`]).toStrictEqual('20')
  //   expect(attr0[`v0/consortium/${idBTC}/mint_limit_daily`]).toStrictEqual('10')

  //   expect(attr0[`v0/consortium/${idDOGE}/members`]).toStrictEqual({
  //     '01': {
  //       name: 'account1DOGE',
  //       ownerAddress: account1,
  //       backingId: 'backing1',
  //       mintLimit: new BigNumber(10),
  //       mintLimitDaily: new BigNumber(5),
  //       status: new BigNumber(0)
  //     },
  //     '02': {
  //       name: 'account2DOGE',
  //       ownerAddress: account2,
  //       backingId: 'backing2',
  //       mintLimit: new BigNumber(10),
  //       mintLimitDaily: new BigNumber(5),
  //       status: new BigNumber(0)
  //     }
  //   })
  //   expect(attr0[`v0/consortium/${idDOGE}/mint_limit`]).toStrictEqual('100')
  //   expect(attr0[`v0/consortium/${idDOGE}/mint_limit_daily`]).toStrictEqual('50')

  //   await tGroup.get(1).rpc.token.mintTokens({ amounts: [`3@${symbolBTC}`] })
  //   await tGroup.get(1).rpc.token.mintTokens({ amounts: [`4@${symbolDOGE}`] })
  //   await tGroup.get(1).generate(1)
  //   await tGroup.waitForSync()

  //   await tGroup.get(2).rpc.token.mintTokens({ amounts: [`1@${symbolBTC}`] })
  //   await tGroup.get(2).rpc.token.mintTokens({ amounts: [`2@${symbolDOGE}`] })
  //   await tGroup.get(2).generate(1)
  //   await tGroup.waitForSync()

  //   expect((await tGroup.get(1).rpc.account.getAccount(account1))).toStrictEqual([
  //     `3.00000000@${symbolBTC}`,
  //     `4.00000000@${symbolDOGE}`
  //   ])

  //   expect((await tGroup.get(2).rpc.account.getAccount(account2))).toStrictEqual([
  //     `1.00000000@${symbolBTC}`,
  //     `2.00000000@${symbolDOGE}`
  //   ])

  //   const attr2 = (await tGroup.get(2).rpc.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
  //   expect(attr2[`v0/live/economy/consortium/${idBTC}/minted`]).toStrictEqual(new BigNumber(4))
  //   expect(attr2[`v0/live/economy/consortium/${idBTC}/burnt`]).toStrictEqual(new BigNumber(0))
  //   expect(attr2[`v0/live/economy/consortium/${idBTC}/supply`]).toStrictEqual(new BigNumber(4))
  //   expect(attr2[`v0/live/economy/consortium_members/${idBTC}/01/minted`]).toStrictEqual(new BigNumber(3))
  //   expect(attr2[`v0/live/economy/consortium_members/${idBTC}/01/daily_minted`]).toStrictEqual('0/3.00000000')
  //   expect(attr2[`v0/live/economy/consortium_members/${idBTC}/01/burnt`]).toStrictEqual(new BigNumber(0))
  //   expect(attr2[`v0/live/economy/consortium_members/${idBTC}/01/supply`]).toStrictEqual(new BigNumber(3))
  //   expect(attr2[`v0/live/economy/consortium_members/${idBTC}/02/minted`]).toStrictEqual(new BigNumber(1))
  //   expect(attr2[`v0/live/economy/consortium_members/${idBTC}/02/daily_minted`]).toStrictEqual('0/1.00000000')
  //   expect(attr2[`v0/live/economy/consortium_members/${idBTC}/02/burnt`]).toStrictEqual(new BigNumber(0))
  //   expect(attr2[`v0/live/economy/consortium_members/${idBTC}/02/supply`]).toStrictEqual(new BigNumber(1))

  //   expect(attr2[`v0/live/economy/consortium/${idDOGE}/minted`]).toStrictEqual(new BigNumber(6))
  //   expect(attr2[`v0/live/economy/consortium/${idDOGE}/burnt`]).toStrictEqual(new BigNumber(0))
  //   expect(attr2[`v0/live/economy/consortium/${idDOGE}/supply`]).toStrictEqual(new BigNumber(6))
  //   expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/01/minted`]).toStrictEqual(new BigNumber(4))
  //   expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/01/daily_minted`]).toStrictEqual('0/4.00000000')
  //   expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/01/burnt`]).toStrictEqual(new BigNumber(0))
  //   expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/01/supply`]).toStrictEqual(new BigNumber(4))
  //   expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/02/minted`]).toStrictEqual(new BigNumber(2))
  //   expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/02/daily_minted`]).toStrictEqual('0/2.00000000')
  //   expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/02/burnt`]).toStrictEqual(new BigNumber(0))
  //   expect(attr2[`v0/live/economy/consortium_members/${idDOGE}/02/supply`]).toStrictEqual(new BigNumber(2))
  // })
})
