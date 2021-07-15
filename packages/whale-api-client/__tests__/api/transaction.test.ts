import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createSignedTxnHex } from '@defichain/testing'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException, WhaleApiValidationException } from '../../src'

describe('transaction', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let client: WhaleApiClient

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    client = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })

  beforeEach(async () => {
    await container.waitForWalletBalanceGTE(15)
  })

  describe('test', () => {
    it('should accept valid txn', async () => {
      const hex = await createSignedTxnHex(container, 10, 9.9999)
      await client.transactions.send({
        hex: hex
      })
    })

    it('should accept valid txn with given maxFeeRate', async () => {
      const hex = await createSignedTxnHex(container, 10, 9.995)
      await client.transactions.test({
        hex: hex, maxFeeRate: 0.05
      })
    })

    it('should reject due to invalid txn', async () => {
      expect.assertions(2)
      try {
        await client.transactions.test({ hex: '0400000100881133bb11aa00cc' })
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiException)
        expect(err.error).toStrictEqual({
          code: 400,
          type: 'BadRequest',
          message: 'Transaction decode failed',
          at: expect.any(Number),
          url: '/v0/regtest/transactions/test'
        })
      }
    })

    it('should reject due to high fees', async () => {
      const hex = await createSignedTxnHex(container, 10, 9)
      expect.assertions(2)
      try {
        await client.transactions.test({
          hex: hex, maxFeeRate: 1
        })
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiException)
        expect(err.error).toStrictEqual({
          code: 400,
          type: 'BadRequest',
          at: expect.any(Number),
          message: 'Transaction is not allowed to be inserted',
          url: '/v0/regtest/transactions/test'
        })
      }
    })
  })

  describe('send', () => {
    it('should send valid txn', async () => {
      const hex = await createSignedTxnHex(container, 10, 9.9999)
      const txid = await client.transactions.send({
        hex: hex
      })
      expect(txid.length).toStrictEqual(64)

      await container.generate(1)
      const out = await container.call('gettxout', [txid, 0])
      expect(out.value).toStrictEqual(9.9999)
    })

    it('should send valid txn with given maxFeeRate', async () => {
      const hex = await createSignedTxnHex(container, 10, 9.995)
      const txid = await client.transactions.send({
        hex: hex, maxFeeRate: 0.05
      })
      expect(txid.length).toStrictEqual(64)

      await container.generate(1)
      const out = await container.call('gettxout', [txid, 0])
      expect(out.value).toStrictEqual(9.995)
    })

    it('should fail due to invalid txn', async () => {
      expect.assertions(2)
      try {
        await client.transactions.send({
          hex: '0400000100881133bb11aa00cc'
        })
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiException)
        expect(err.error).toStrictEqual({
          code: 400,
          type: 'BadRequest',
          at: expect.any(Number),
          url: '/v0/regtest/transactions',
          message: 'Transaction decode failed'
        })
      }
    })

    it('should fail due to high fees', async () => {
      const hex = await createSignedTxnHex(container, 10, 9)

      expect.assertions(2)
      try {
        await client.transactions.send({
          hex: hex, maxFeeRate: 1
        })
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiException)
        expect(err.error).toStrictEqual({
          code: 400,
          type: 'BadRequest',
          at: expect.any(Number),
          url: '/v0/regtest/transactions',
          message: 'Absurdly high fee'
        })
      }
    })

    it('should fail validation (empty hex)', async () => {
      expect.assertions(3)
      try {
        await client.transactions.send({
          hex: ''
        })
        expect('must fail').toBeUndefined()
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiValidationException)
        expect(err.message).toStrictEqual('422 - ValidationError (/v0/regtest/transactions)')
        expect(err.properties).toStrictEqual([{
          constraints: [
            'hex must be a hexadecimal number',
            'hex should not be empty'
          ],
          property: 'hex',
          value: ''
        }])
      }
    })

    it('should fail validation (not hex)', async () => {
      expect.assertions(3)
      try {
        await client.transactions.send({
          hex: 'fuxingloh'
        })
        expect('must fail').toBeUndefined()
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiValidationException)
        expect(err.message).toStrictEqual('422 - ValidationError (/v0/regtest/transactions)')
        expect(err.properties).toStrictEqual([{
          constraints: [
            'hex must be a hexadecimal number'
          ],
          property: 'hex',
          value: 'fuxingloh'
        }])
      }
    })

    it('should fail validation (negative fee)', async () => {
      expect.assertions(3)
      try {
        await client.transactions.send({
          hex: '00', maxFeeRate: -1.5
        })
        expect('must fail').toBeUndefined()
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiValidationException)
        expect(err.message).toStrictEqual('422 - ValidationError (/v0/regtest/transactions)')
        expect(err.properties).toStrictEqual([{
          constraints: [
            'maxFeeRate must not be less than 0'
          ],
          property: 'maxFeeRate',
          value: -1.5
        }])
      }
    })

    it('should fail validation (not number fee)', async () => {
      expect.assertions(3)
      try {
        await client.transactions.send({
          // @ts-expect-error
          hex: '00', maxFeeRate: 'abc'
        })
        expect('must fail').toBeUndefined()
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiValidationException)
        expect(err.message).toStrictEqual('422 - ValidationError (/v0/regtest/transactions)')
        expect(err.properties).toStrictEqual([{
          constraints: [
            'maxFeeRate must not be less than 0',
            'maxFeeRate must be a number conforming to the specified constraints'
          ],
          property: 'maxFeeRate',
          value: 'abc'
        }])
      }
    })
  })

  describe('estimateFee', () => {
    it('should be fixed fee of 0.00005000 when there are no transactions', async () => {
      const feeRate = await client.transactions.estimateFee(10)
      expect(feeRate).toStrictEqual(0.00005000)
    })
  })

  describe('get', () => {
    let txid: string

    async function setup (): Promise<void> {
      const address = await container.getNewAddress()
      const metadata = {
        symbol: 'ETH',
        name: 'ETH',
        isDAT: true,
        mintable: true,
        tradeable: true,
        collateralAddress: address
      }

      txid = await container.call('createtoken', [metadata])

      await container.generate(1)

      const height = await container.call('getblockcount')

      await service.waitForIndexedHeight(height)
    }

    beforeAll(async () => {
      await setup()
    })

    it('should get a single transaction', async () => {
      const transaction = await client.transactions.get(txid)
      expect(transaction).toStrictEqual({
        id: txid,
        block: {
          hash: expect.any(String),
          height: expect.any(Number)
        },
        txid,
        hash: txid,
        version: expect.any(Number),
        size: expect.any(Number),
        vSize: expect.any(Number),
        weight: expect.any(Number),
        lockTime: expect.any(Number),
        vinCount: expect.any(Number),
        voutCount: expect.any(Number)
      })
    })

    it('should fail due to non-existent transaction', async () => {
      expect.assertions(2)
      try {
        await client.transactions.get('invalidtransactionid')
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiException)
        expect(err.error).toStrictEqual({
          code: 404,
          type: 'NotFound',
          at: expect.any(Number),
          message: 'Unable to find transaction by id: invalidtransactionid',
          url: '/v0/regtest/transactions/invalidtransactionid'
        })
      }
    })
  })
})
