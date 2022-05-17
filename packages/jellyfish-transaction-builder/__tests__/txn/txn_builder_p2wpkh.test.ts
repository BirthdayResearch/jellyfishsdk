import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTxnBuilder } from '../../src'
import { fundEllipticPair } from '../test.utils'
import { CDfTx, DeFiOpUnmapped, OP_CODES, OP_DEFI_TX } from '@defichain/jellyfish-transaction'
import { RegTest } from '@defichain/jellyfish-network'

// P2WPKHTxnBuilder is abstract and not instantiable
class TestBuilder extends P2WPKHTxnBuilder {}

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: TestBuilder

const dummyDfTx = new OP_DEFI_TX({
  signature: CDfTx.SIGNATURE,
  type: 0x01,
  name: 'dummy',
  data: {
    // dummy, unmapped dftx
    hex: '001234'
  }
})

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(container)
  builder = new TestBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(101)

  await fundEllipticPair(container, providers.elliptic.ellipticPair, 10) // 10
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 10) // 10
  await providers.setupMocks()
})

describe('createDeFiTx()', () => {
  it('should create DfTx stack correctly and return change as vout', async () => {
    const change = await providers.elliptic.script()
    const result = await builder.createDeFiTx(dummyDfTx, change)

    expect(result.vin.length).toStrictEqual(1)
    expect(result.vout.length).toStrictEqual(2) // 1 DfTx, 1 change
    expect(result.vout[0].value).toStrictEqual(new BigNumber(0))
    expect(result.vout[1].script).toStrictEqual(change)

    // under normal (non test) env, only required amount of prevout will be taken and aggregated
    // test provider here simply collect everything
    expect(result.vout[1].value.gt(9.999)).toBeTruthy()
    expect(result.vout[1].value.lt(10)).toBeTruthy()

    expect(result.vout[0].script.stack.length).toStrictEqual(2)
    expect(result.vout[0].script.stack[0]).toStrictEqual(OP_CODES.OP_RETURN)
    expect(result.vout[0].script.stack[1].type).toStrictEqual('OP_DEFI_TX')

    const tx = (result.vout[0].script.stack[1] as OP_DEFI_TX).tx
    expect(tx.signature).toStrictEqual(1147556984)
    expect(tx.type).toStrictEqual(0x01)
    expect(tx.name).toStrictEqual('OP_DEFI_TX_UNMAPPED')

    const unmapped = tx.data as DeFiOpUnmapped
    expect(unmapped.hex).toStrictEqual('001234')
  })

  it('balance should be deducted accordingly based on spent on DfTx - higher val', async () => {
    {
      const address = await providers.getAddress()
      const unspent: any[] = await container.call('listunspent', [
        1, 9999999, [address], true
      ])

      console.log(unspent)
    }
    // add another utxo of 115
    await fundEllipticPair(container, providers.elliptic.ellipticPair, 115) // 135

    {
      const address = await providers.getAddress()
      const unspent: any[] = await container.call('listunspent', [
        1, 9999999, [address], true
      ])

      console.log(unspent)
    }

    const spendAmount = new BigNumber(134.56) // eg: utxosToAccount, the custom tx costed this

    const change = await providers.elliptic.script()
    const result = await builder.createDeFiTx(dummyDfTx, change, spendAmount)

    expect(result.vin.length).toStrictEqual(3)
    expect(result.vout.length).toStrictEqual(2) // 1 DfTx, 1 change
    expect(result.vout[0].value).toStrictEqual(spendAmount)
    expect(result.vout[1].script).toStrictEqual(change)
    expect(result.vout[1].value.gt(new BigNumber(134.999).minus(spendAmount))).toBeTruthy()
    expect(result.vout[1].value.lt(new BigNumber(135).minus(spendAmount))).toBeTruthy()
  })

  it('balance should be deducted accordingly based on spent on DfTx', async () => {
    // add another utxo of 5
    await fundEllipticPair(container, providers.elliptic.ellipticPair, 5) // 25

    const spendAmount = new BigNumber(24.56) // eg: utxosToAccount, the custom tx costed this

    const change = await providers.elliptic.script()
    const result = await builder.createDeFiTx(dummyDfTx, change, spendAmount)

    expect(result.vin.length).toStrictEqual(3)
    expect(result.vout.length).toStrictEqual(2) // 1 DfTx, 1 change
    expect(result.vout[0].value).toStrictEqual(spendAmount)
    expect(result.vout[1].script).toStrictEqual(change)
    expect(result.vout[1].value.gt(new BigNumber(24.999).minus(spendAmount))).toBeTruthy()
    expect(result.vout[1].value.lt(new BigNumber(25).minus(spendAmount))).toBeTruthy()
  })
})
