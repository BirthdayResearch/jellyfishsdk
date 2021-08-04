import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createSignedTxnHex } from '@defichain/testing'
import { Bech32, Elliptic, HRP } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'
import { BadRequestApiException } from '@src/module.api/_core/api.error'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import { RawtxController } from '@src/module.api/rawtx.controller'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: RawtxController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  controller = app.get<RawtxController>(RawtxController)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

async function expectTxn (txid: string, amount: number, pubKey: Buffer): Promise<void> {
  const details = await container.call('gettxout', [txid, 0])

  expect(details.value.toString(10)).toStrictEqual(amount.toString())
  expect(details.scriptPubKey.addresses[0]).toStrictEqual(
    Bech32.fromPubKey(pubKey, RegTest.bech32.hrp as HRP)
  )
}

describe('test', () => {
  it('should accept valid txn', async () => {
    const hex = await createSignedTxnHex(container, 10, 9.9999)
    await controller.test({
      hex: hex
    })
  })

  it('should accept valid txn with given maxFeeRate', async () => {
    const hex = await createSignedTxnHex(container, 10, 9.995)
    await controller.test({
      hex: hex,
      maxFeeRate: 0.05
    })
  })

  it('should throw BadRequestError due to invalid txn', async () => {
    expect.assertions(2)
    try {
      await controller.test({ hex: '0400000100881133bb11aa00cc' })
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestApiException)
      expect(err.response.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        message: 'Transaction decode failed',
        at: expect.any(Number)
      })
    }
  })

  it('should throw BadRequestError due to high fees', async () => {
    const hex = await createSignedTxnHex(container, 10, 9)
    expect.assertions(2)
    try {
      await controller.test({
        hex: hex, maxFeeRate: 1.0
      })
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestApiException)
      expect(err.response.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: 'Transaction is not allowed to be inserted'
      })
    }
  })
})

describe('send', () => {
  it('should send valid txn and validate tx out', async () => {
    const aPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const bPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))

    const hex = await createSignedTxnHex(container, 10, 9.9999, { aEllipticPair: aPair, bEllipticPair: bPair })
    const txid = await controller.send({
      hex: hex
    })

    await container.generate(1)
    await expectTxn(txid, 9.9999, await bPair.publicKey())
  })

  it('should send valid txn with given maxFeeRate and validate tx out', async () => {
    const aPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const bPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))

    const hex = await createSignedTxnHex(container, 10, 9.995, { aEllipticPair: aPair, bEllipticPair: bPair })
    const txid = await controller.send({
      hex: hex,
      maxFeeRate: 0.05
    })

    await container.generate(1)
    await expectTxn(txid, 9.995, await bPair.publicKey())
  })

  it('should throw BadRequestException due to invalid txn', async () => {
    expect.assertions(2)
    try {
      await controller.send({
        hex: '0400000100881133bb11aa00cc'
      })
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestApiException)
      expect(err.response.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: 'Transaction decode failed'
      })
    }
  })

  it('should throw BadRequestException due to high fees', async () => {
    const hex = await createSignedTxnHex(container, 10, 9)
    expect.assertions(2)
    try {
      await controller.send({
        hex: hex, maxFeeRate: 1
      })
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestApiException)
      expect(err.response.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: 'Absurdly high fee'
      })
    }
  })
})
