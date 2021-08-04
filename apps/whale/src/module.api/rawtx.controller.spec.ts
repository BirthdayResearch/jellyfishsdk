import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createSignedTxnHex } from '@defichain/testing'
import { Bech32, Elliptic, HRP } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'
import { BadRequestApiException } from '@src/module.api/_core/api.error'
import { ConfigModule } from '@nestjs/config'
import { RawtxController } from '@src/module.api/rawtx.controller'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: RawtxController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(11)
  const defidUrl = await container.getCachedRpcUrl()

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({ defid: { url: defidUrl } })]
      })
    ],
    controllers: [RawtxController],
    providers: [{ provide: JsonRpcClient, useValue: client }]
  }).compile()

  controller = app.get<RawtxController>(RawtxController)
})

async function expectTxn (txid: string, amount: number, pubKey: Buffer): Promise<void> {
  const details = await client.blockchain.getTxOut(txid, 0)

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

  it('should throw BadRequestException due to any error and report message', async () => {
    const hex = await createSignedTxnHex(container, 10, 1000)
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
        message: 'bad-txns-in-belowout, value in (10.00) < value out (1000.00) (code 16)'
      })
    }
  })
})
