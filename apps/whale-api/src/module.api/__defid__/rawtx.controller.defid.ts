import { Bech32, Elliptic, HRP } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'
import { DRawTxController, DefidBin, DefidRpc } from '../../e2e.defid.module'

let container: DefidRpc
let app: DefidBin
let controller: DRawTxController

beforeAll(async () => {
  app = new DefidBin()
  await app.start()
  controller = app.ocean.rawTxController
  container = app.rpc
  await app.waitForWalletCoinbaseMaturity()
  await app.waitForWalletBalanceGTE(100)
})

afterAll(async () => {
  await app.stop()
})

async function expectTxn (txid: string, amount: number, pubKey: Buffer): Promise<void> {
  const details = await app.call('gettxout', [txid, 0])

  expect(details.value.toString(10)).toStrictEqual(amount.toString())
  expect(details.scriptPubKey.addresses[0]).toStrictEqual(
    Bech32.fromPubKey(pubKey, RegTest.bech32.hrp as HRP)
  )
}

describe('test', () => {
  it('should accept valid txn', async () => {
    const hex = await app.createSignedTxnHex(10, 9.9999)
    await controller.test({
      hex: hex
    })
  })

  it('should accept valid txn with given maxFeeRate', async () => {
    const hex = await app.createSignedTxnHex(10, 9.995)
    await controller.test({
      hex: hex,
      maxFeeRate: 0.05
    })
  })

  it('should throw BadRequestError due to invalid txn', async () => {
    // expect.assertions(2)
    // try {
    //   await controller.test({ hex: '0400000100881133bb11aa00cc' })
    // } catch (err: any) {
    //   expect(err).toBeInstanceOf(BadRequestApiException)
    //   expect(err.response.error).toStrictEqual({
    //     code: 400,
    //     type: 'BadRequest',
    //     message: 'Transaction decode failed',
    //     at: expect.any(Number)
    //   })
    // }
    const res: any = await controller.test({ hex: '0400000100881133bb11aa00cc' })
    expect(res.code).toStrictEqual(400)
    expect(res.message).toStrictEqual('Transaction decode failed')
  })

  it('should throw BadRequestError due to high fees', async () => {
    const hex = await app.createSignedTxnHex(10, 9)
    // expect.assertions(2)
    // try {
    //   await controller.test({
    //     hex: hex, maxFeeRate: 1.0
    //   })
    // } catch (err: any) {
    //   expect(err).toBeInstanceOf(BadRequestApiException)
    //   expect(err.response.error).toStrictEqual({
    //     code: 400,
    //     type: 'BadRequest',
    //     at: expect.any(Number),
    //     message: 'Transaction is not allowed to be inserted'
    //   })
    // }
    const res: any = await controller.test({ hex: hex, maxFeeRate: 1.0 })
    expect(res.code).toStrictEqual(400)
    expect(res.message).toStrictEqual('Transaction is not allowed to be inserted')
  })
})

describe('send', () => {
  it('should send valid txn and validate tx out', async () => {
    const aPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const bPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))

    const hex = await app.createSignedTxnHex(10, 9.9999, { aEllipticPair: aPair, bEllipticPair: bPair })
    const txid = await controller.send({
      hex: hex
    })

    await container.generate(1)
    await expectTxn(txid, 9.9999, await bPair.publicKey())
  })

  it('should send valid txn with given maxFeeRate and validate tx out', async () => {
    const aPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const bPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))

    const hex = await app.createSignedTxnHex(10, 9.995, { aEllipticPair: aPair, bEllipticPair: bPair })
    const txid = await controller.send({
      hex: hex,
      maxFeeRate: 0.05
    })

    await container.generate(1)
    await expectTxn(txid, 9.995, await bPair.publicKey())
  })

  it('should throw BadRequestException due to invalid txn', async () => {
    // expect.assertions(2)
    // try {
    //   await controller.send({
    //     hex: '0400000100881133bb11aa00cc'
    //   })
    // } catch (err: any) {
    //   expect(err).toBeInstanceOf(BadRequestApiException)
    //   expect(err.response.error).toStrictEqual({
    //     code: 400,
    //     type: 'BadRequest',
    //     at: expect.any(Number),
    //     message: 'Transaction decode failed'
    //   })
    // }
    const res: any = await controller.test({ hex: '0400000100881133bb11aa00cc' })
    expect(res.code).toStrictEqual(400)
    expect(res.message).toStrictEqual('Transaction decode failed')
  })

  it('should throw BadRequestException due to high fees', async () => {
    const hex = await app.createSignedTxnHex(10, 9)
    // expect.assertions(2)
    // try {
    //   await controller.send({
    //     hex: hex, maxFeeRate: 1
    //   })
    // } catch (err: any) {
    //   expect(err).toBeInstanceOf(BadRequestApiException)
    //   expect(err.response.error).toStrictEqual({
    //     code: 400,
    //     type: 'BadRequest',
    //     at: expect.any(Number),
    //     message: 'Absurdly high fee'
    //   })
    // }
    const res: any = await controller.test({ hex: hex, maxFeeRate: 1 })
    expect(res.code).toStrictEqual(400)
    expect(res.message).toStrictEqual('Absurdly high fee')
  })
})

describe('get', () => {
  it('should accept valid txn and return hex', async () => {
    const hex = await app.createSignedTxnHex(10, 9.9999)
    const txid = await controller.send({
      hex: hex
    })

    const getResult = await controller.get(txid, false)

    expect(hex).toStrictEqual(getResult)
  })

  it('should throw NotFoundException due to tx id not found', async () => {
    // try {
    //   await controller.get('4f9f92b4b2cade30393ecfcd0656db06e57f6edb0a176452b2fecf361dd3a061', false)
    // } catch (err: any) {
    //   expect(err).toBeInstanceOf(NotFoundException)
    //   expect(err.response.error).toStrictEqual('Not Found')
    // }
    const res: any = await controller.get('4f9f92b4b2cade30393ecfcd0656db06e57f6edb0a176452b2fecf361dd3a061', false)
    expect(res.code).toStrictEqual(404)
    expect(res.message).toStrictEqual('Transaction could not be found')
  })
})
