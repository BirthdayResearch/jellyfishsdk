import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RichListController } from '../../src/controllers/RichList'
import { RichListCoreTest, waitForCatchingUp } from '@defichain/rich-list-core/test/RichListCoreTest'
import { RichListCore } from '@defichain/rich-list-core'
import { Testing } from '@defichain/jellyfish-testing'

describe('RichListController', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())
  let richListController!: RichListController
  let core: RichListCore

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    core = RichListCoreTest(testing.rpc)
    richListController = new RichListController(core)
    await core.start()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should reject invalid number as token id', async () => {
    await expect(richListController.get(NaN)).rejects.toThrow('Not Found')
  })

  it('should reject token id not found in defid', async () => {
    await expect(richListController.get(88888)).rejects.toThrow('Not Found')
  })

  it('should retrieve rich list', async () => {
    await waitForCatchingUp(core)
    await core.calculateNext()
    const expected = await core.get('-1')
    const actual = await richListController.get(-1)

    expect(actual.length).toStrictEqual(expected.length)
    expect(actual).toStrictEqual(expected)
  })

  it('should retrieve utxo rich list', async () => {
    await waitForCatchingUp(core)
    await core.calculateNext()
    const expected = await core.get('-1')
    const actual = await richListController.get(-1)

    expect(actual.length).toStrictEqual(expected.length)
    expect(actual).toStrictEqual(expected)
  })
  it('should retrieve newly added rich addresses', async () => {
    await waitForCatchingUp(core)
    await core.calculateNext()
    const expected = await core.get('-1')
    let actual = await richListController.get(-1)
    expect(actual.length).toStrictEqual(expected.length)
    expect(actual).toStrictEqual(expected)

    const newRich = await testing.container.getNewAddress()
    await testing.container.fundAddress(newRich, 100)
    await core.start()
    await waitForCatchingUp(core)
    await core.calculateNext()

    actual = await richListController.get(-1)
    expect(actual).toContainEqual({
      address: newRich,
      amount: expect.any(Number)
    })
  })

  it('should retrieve token rich list', async () => {
    const newRich = await testing.container.getNewAddress()
    await testing.container.fundAddress(newRich, 100)
    await testing.rpc.token.createToken({
      symbol: 'RLST',
      name: 'RichListToken',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: newRich
    })
    await testing.container.generate(1)
    await testing.rpc.token.mintTokens('10000@RLST')
    await testing.container.generate(1)
    await core.start()
    await waitForCatchingUp(core)
    await core.calculateNext()

    const expected = await core.get('1')
    const actual = await richListController.get(1)

    expect(actual.length).toStrictEqual(expected.length)
    expect(actual).toStrictEqual(expected)
    expect(actual).toContainEqual({
      address: newRich,
      amount: 10000
    })
  })
})
