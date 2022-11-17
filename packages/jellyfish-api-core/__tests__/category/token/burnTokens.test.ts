import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'

describe('burnTokens', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let address: string
  const symbolDBTC = 'DBTC'

  beforeAll(async () => {
    await container.start()
    await setup()
  })

  afterAll(async () => {
    await container.start()
  })

  async function setup (): Promise<void> {
    await container.waitForWalletCoinbaseMaturity()

    address = await testing.generateAddress()

    await testing.rpc.token.createToken({
      symbol: symbolDBTC,
      name: symbolDBTC,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    })
    await testing.generate(1)

    await testing.rpc.token.mintTokens(`10@${symbolDBTC}`)
    await testing.generate(1)

    await testing.container.fundAddress(address, 10)
  }

  it('should throw an error if invalid value is provided for amount', async () => {
    // @ts-expect-error
    await expect(testing.rpc.token.burnTokens(null, address)).rejects.toThrow('Invalid parameters, argument "amounts" must not be null')
    await expect(testing.rpc.token.burnTokens('', address)).rejects.toThrow(': Invalid amount')
    await expect(testing.rpc.token.burnTokens(`A@${symbolDBTC}`, address)).rejects.toThrow(': Invalid amount')
    await expect(testing.rpc.token.burnTokens('2@ABC', address)).rejects.toThrow(': Invalid Defi token: ABC')
    await expect(testing.rpc.token.burnTokens(`-2@${symbolDBTC}`, address)).rejects.toThrow('RpcApiError: \': Amount out of range\', code: -3, method: burntokens')
  })

  it('should throw an error if invalid value is provided for from', async () => {
    // @ts-expect-error
    await expect(testing.rpc.token.burnTokens(`2@${symbolDBTC}`, null)).rejects.toThrow('Invalid parameters, argument "from" must not be null')
    await expect(testing.rpc.token.burnTokens(`2@${symbolDBTC}`, '')).rejects.toThrow('recipient () does not refer to any valid address')
    await expect(testing.rpc.token.burnTokens(`2@${symbolDBTC}`, 'ABC')).rejects.toThrow('recipient (ABC) does not refer to any valid address')
  })

  it('should throw an error if not enough tokens are available to burn', async () => {
    const promise = testing.rpc.token.burnTokens(`11@${symbolDBTC}`, address)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test BurnTokenTx execution failed:\nnot enough tokens exist to subtract this amount\', code: -32600, method: burntokens')
  })

  it('should burn tokens without context', async () => {
    const burnTxId = await testing.rpc.token.burnTokens(`1@${symbolDBTC}`, address)
    expect(burnTxId).not.toBe(null)

    await testing.generate(1)

    const tokensAfterBurn = await testing.rpc.account.getAccount(address)
    expect(tokensAfterBurn[0]).toStrictEqual(`9.00000000@${symbolDBTC}`)
  })

  it('should burn tokens with context', async () => {
    const burnTxId = await testing.rpc.token.burnTokens(`1@${symbolDBTC}`, address, address)
    expect(burnTxId).not.toBe(null)

    await testing.generate(1)

    const tokensAfterBurn = await testing.rpc.account.getAccount(address)
    expect(tokensAfterBurn[0]).toStrictEqual(`8.00000000@${symbolDBTC}`)
  })

  it('should burn tokens with utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(address, 10)

    const burnTxId = await testing.rpc.token.burnTokens(`1@${symbolDBTC}`, address, address, [{ txid, vout }])
    expect(burnTxId).not.toBe(null)

    await testing.generate(1)

    const tokensAfterBurn = await testing.rpc.account.getAccount(address)
    expect(tokensAfterBurn[0]).toStrictEqual(`7.00000000@${symbolDBTC}`)
  })
})
