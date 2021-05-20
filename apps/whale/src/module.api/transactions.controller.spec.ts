import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TransactionsController } from '@src/module.api/transactions.controller'
import BigNumber from 'bignumber.js'
import { EllipticPair, Bech32, WIF, Elliptic, HRP } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'
import { BadRequestApiException } from '@src/module.api/_core/api.error'

describe('raw transactions test/send', () => {
  const container = new MasterNodeRegTestContainer()
  let client: JsonRpcClient
  let controller: TransactionsController

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    await container.stop()
  })

  beforeEach(async () => {
    await container.waitForWalletBalanceGTE(11)

    const app: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: JsonRpcClient, useValue: client }]
    }).compile()

    controller = app.get<TransactionsController>(TransactionsController)
  })

  async function createSignedTxnHex (
    aAmount: number,
    bAmount: number,
    a: EllipticPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii')),
    b: EllipticPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
  ): Promise<string> {
    const aBech32 = Bech32.fromPubKey(await a.publicKey(), RegTest.bech32.hrp as HRP)
    const bBech32 = Bech32.fromPubKey(await b.publicKey(), RegTest.bech32.hrp as HRP)

    const { txid, vout } = await container.fundAddress(aBech32, aAmount)
    const inputs = [{ txid: txid, vout: vout }]

    const unsigned = await client.rawtx.createRawTransaction(inputs, {
      [bBech32]: new BigNumber(bAmount)
    })
    const signed = await client.rawtx.signRawTransactionWithKey(unsigned, [
      WIF.encode(RegTest.wifPrefix, await a.privateKey())
    ])
    return signed.hex
  }

  async function expectTxn (txid: string, amount: number, pubKey: Buffer): Promise<void> {
    const details = await client.blockchain.getTxOut(txid, 0)

    expect(details.value.toString(10)).toBe(amount.toString())
    expect(details.scriptPubKey.addresses[0]).toBe(
      Bech32.fromPubKey(pubKey, RegTest.bech32.hrp as HRP)
    )
  }

  describe('controller.test()', () => {
    it('should accept valid txn', async () => {
      const hex = await createSignedTxnHex(10, 9.9999)
      await controller.test({
        hex: hex
      })
    })

    it('should accept valid txn with given maxFeeRate', async () => {
      const hex = await createSignedTxnHex(10, 9.995)
      await controller.test({
        hex: hex,
        maxFeeRate: 0.05
      })
    })

    it('should throw BadRequestError due to invalid txn', async () => {
      const hex = '0400000100881133bb11aa00cc'
      await expect(controller.test({
        hex: hex
      })).rejects.toThrow(BadRequestApiException)
    })

    it('should throw BadRequestError due to high fees', async () => {
      const hex = await createSignedTxnHex(10, 9)
      await expect(controller.test({
        hex: hex,
        maxFeeRate: 1.0
      })).rejects.toThrow(BadRequestApiException)
    })
  })

  describe('controller.send()', () => {
    it('should send valid txn and validate tx out', async () => {
      const aPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
      const bPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))

      const hex = await createSignedTxnHex(10, 9.9999, aPair, bPair)
      const txid = await controller.send({
        hex: hex
      })

      await container.generate(1)
      await expectTxn(txid, 9.9999, await bPair.publicKey())
    })

    it('should send valid txn with given maxFeeRate and validate tx out', async () => {
      const aPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
      const bPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))

      const hex = await createSignedTxnHex(10, 9.995, aPair, bPair)
      const txid = await controller.send({
        hex: hex,
        maxFeeRate: 0.05
      })

      await container.generate(1)
      await expectTxn(txid, 9.995, await bPair.publicKey())
    })

    it('should throw BadRequestException due to invalid txn', async () => {
      const hex = '0400000100881133bb11aa00cc'
      await expect(controller.send({
        hex: hex
      })).rejects.toThrow(BadRequestApiException)
    })

    it('should throw BadRequestException due to high fees', async () => {
      const hex = await createSignedTxnHex(10, 9)
      await expect(controller.send({
        hex: hex,
        maxFeeRate: 1.0
      })).rejects.toThrow(BadRequestApiException)
    })
  })
})

describe('estimate fee rate', () => {
  const container = new MasterNodeRegTestContainer()
  let client: JsonRpcClient
  let controller: TransactionsController

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForBlock(125)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    await container.stop()
  })

  beforeEach(async () => {
    await container.waitForWalletBalanceGTE(100)

    const app: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: JsonRpcClient, useValue: client }]
    }).compile()

    controller = app.get<TransactionsController>(TransactionsController)
  })

  it('should have fee of 0.00005 and not 0.00005 after adding activity', async () => {
    const before = await controller.estimateFee(10)
    expect(before).toBe(0.00005000)

    for (let i = 0; i < 10; i++) {
      for (let x = 0; x < 20; x++) {
        await client.wallet.sendToAddress('bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r', 0.1, {
          subtractFeeFromAmount: true,
          avoidReuse: false
        })
      }
      await container.generate(1)
    }
    const after = await controller.estimateFee(10)
    expect(after).not.toBe(0.00005000)
  })
})
