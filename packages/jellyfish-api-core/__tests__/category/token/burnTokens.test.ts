import { TestingGroup } from '@defichain/jellyfish-testing'

describe('burnTokens', () => {
  const tGroup = TestingGroup.create(3)
  const symbolDBTC = 'DBTC'
  let account0: string, account1: string
  // let account2: string
  // let idBTC: string

  beforeEach(async () => {
    await tGroup.start()

    account0 = await tGroup.get(0).generateAddress()
    account1 = await tGroup.get(1).generateAddress()
    // account2 = await tGroup.get(2).generateAddress()

    await tGroup.get(0).token.create({
      symbol: symbolDBTC,
      name: symbolDBTC,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: account0
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).container.fundAddress(account0, 10)
    await tGroup.get(0).container.fundAddress(account1, 10)

    await tGroup.get(0).generate(1)

    // idBTC = await tGroup.get(0).token.getTokenId(symbolDBTC)

    // await setGovAttr({ 'v0/params/feature/consortium': 'true' })

    // await setGovAttr({
    //   [`v0/consortium/${idBTC}/mint_limit`]: '10',
    //   [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',
    //   [`v0/consortium/${idBTC}/members`]: {
    //     '02': {
    //       name: 'account2BTC',
    //       ownerAddress: account0,
    //       mintLimitDaily: 5,
    //       mintLimit: 10,
    //       backingId: 'backing2'
    //     },
    //     '03': {
    //       name: 'account3BTC',
    //       ownerAddress: account2,
    //       mintLimitDaily: 5,
    //       mintLimit: 10,
    //       backingId: 'backing2'
    //     }
    //   }
    // })

    await tGroup.get(0).rpc.token.mintTokens({ amounts: [`10@${symbolDBTC}`] })
    await tGroup.get(0).generate(1)
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  // async function setGovAttr (attributes: object): Promise<void> {
  //   const hash = await tGroup.get(0).rpc.masternode.setGov({ ATTRIBUTES: attributes })
  //   expect(hash).toBeTruthy()
  //   await tGroup.get(0).generate(1)
  // }

  it('should throw an error if invalid value is provided for amount', async () => {
    // @ts-expect-error
    await expect(tGroup.get(0).rpc.token.burnTokens(null, account0)).rejects.toThrow('Invalid parameters, argument "amounts" must not be null')
    await expect(tGroup.get(0).rpc.token.burnTokens('', account0)).rejects.toThrow(': Invalid amount')
    await expect(tGroup.get(0).rpc.token.burnTokens(`A@${symbolDBTC}`, account0)).rejects.toThrow(': Invalid amount')
    await expect(tGroup.get(0).rpc.token.burnTokens('2@ABC', account0)).rejects.toThrow(': Invalid Defi token: ABC')
    await expect(tGroup.get(0).rpc.token.burnTokens(`-2@${symbolDBTC}`, account0)).rejects.toThrow('RpcApiError: \': Amount out of range\', code: -3, method: burntokens')
  })

  it('should throw an error if invalid value is provided for from', async () => {
    await expect(tGroup.get(0).rpc.token.burnTokens(`2@${symbolDBTC}`, '')).rejects.toThrow('recipient () does not refer to any valid address')
    await expect(tGroup.get(0).rpc.token.burnTokens(`2@${symbolDBTC}`, 'ABC')).rejects.toThrow('recipient (ABC) does not refer to any valid address')
  })

  it('should throw an error if not enough tokens are available to burn', async () => {
    const promise = tGroup.get(0).rpc.token.burnTokens(`11@${symbolDBTC}`, account0)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test BurnTokenTx execution failed:\namount 10.00000000 is less than 11.00000000\', code: -32600, method: burntokens')
  })

  it('should throw an error if tried to burn tokens under another masternode', async () => {
    const promise = tGroup.get(0).rpc.token.burnTokens(`1@${symbolDBTC}`, account1)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Incorrect authorization for ${account1}', code: -5, method: burntokens`)
  })

  it('should burn tokens without context', async () => {
    const burnTxId = await tGroup.get(0).rpc.token.burnTokens(`1@${symbolDBTC}`, account0)
    expect(burnTxId).toBeTruthy()

    await tGroup.get(0).generate(1)

    const tokensAfterBurn = await tGroup.get(0).rpc.account.getAccount(account0)
    expect(tokensAfterBurn[0]).toStrictEqual(`9.00000000@${symbolDBTC}`)
  })

  it('should burn tokens with context', async () => {
    const burnTxId = await tGroup.get(0).rpc.token.burnTokens(`1@${symbolDBTC}`, account0, account0)
    expect(burnTxId).toBeTruthy()

    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const tokensAfterBurn = await tGroup.get(0).rpc.account.getAccount(account0)
    expect(tokensAfterBurn[0]).toStrictEqual(`9.00000000@${symbolDBTC}`)

    // const attr = (await tGroup.get(2).rpc.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    // expect(attr['v0/live/economy/consortium/1/burnt']).toStrictEqual(new BigNumber(1))
  })

  it('should burn tokens with utxos', async () => {
    const { txid, vout } = await tGroup.get(0).container.fundAddress(account0, 10)

    const burnTxId = await tGroup.get(0).rpc.token.burnTokens(`1@${symbolDBTC}`, account0, account0, [{ txid, vout }])
    expect(burnTxId).toBeTruthy()

    await tGroup.get(0).generate(1)

    const tokensAfterBurn = await tGroup.get(0).rpc.account.getAccount(account0)
    expect(tokensAfterBurn[0]).toStrictEqual(`9.00000000@${symbolDBTC}`)
  })
})
