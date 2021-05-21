import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createSignedTxnHex } from '@defichain/testing'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiValidationException } from '../../src'

describe('raw transaction send/test', () => {
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

  describe('transactions.test()', () => {
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
      const hex = '0400000100881133bb11aa00cc'
      const call = async (): Promise<void> => await client.transactions.test({
        hex: hex
      })
      await expect(call).rejects
        .toThrow('400 - BadRequest (/v1/regtest/transactions/test)')
    })

    it('should reject due to high fees', async () => {
      const hex = await createSignedTxnHex(container, 10, 9)
      const call = async (): Promise<void> => await client.transactions.test({
        hex: hex, maxFeeRate: 1
      })
      await expect(call).rejects
        .toThrow('400 - BadRequest (/v1/regtest/transactions/test)')
    })
  })

  describe('transactions.send()', () => {
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
      const hex = '0400000100881133bb11aa00cc'
      const call = async (): Promise<string> => await client.transactions.send({
        hex: hex
      })
      await expect(call).rejects
        .toThrow('400 - BadRequest (/v1/regtest/transactions)')
    })

    it('should fail due to high fees', async () => {
      const hex = await createSignedTxnHex(container, 10, 9)
      const call = async (): Promise<string> => await client.transactions.send({
        hex: hex, maxFeeRate: 1
      })
      await expect(call).rejects
        .toThrow('400 - BadRequest (/v1/regtest/transactions)')
    })
  })

  describe('transactions.[test/send]() validations', () => {
    it('should fail validation (empty hex)', async () => {
      try {
        await client.transactions.send({
          hex: ''
        })
        expect('must fail').toBeUndefined()
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiValidationException)
        expect(err.message).toStrictEqual('422 - ValidationError (/v1/regtest/transactions)')
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
      try {
        await client.transactions.send({
          hex: 'fuxingloh'
        })
        expect('must fail').toBeUndefined()
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiValidationException)
        expect(err.message).toStrictEqual('422 - ValidationError (/v1/regtest/transactions)')
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
      try {
        await client.transactions.send({
          hex: '00', maxFeeRate: -1.5
        })
        expect('must fail').toBeUndefined()
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiValidationException)
        expect(err.message).toStrictEqual('422 - ValidationError (/v1/regtest/transactions)')
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
      try {
        await client.transactions.send({
          // @ts-expect-error
          hex: '00', maxFeeRate: 'abc'
        })
        expect('must fail').toBeUndefined()
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiValidationException)
        expect(err.message).toStrictEqual('422 - ValidationError (/v1/regtest/transactions)')
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
})

describe('estimate fee rate', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let client: WhaleApiClient

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    client = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForReady()
    await service.start()
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })

  it('should be fixed fee of 0.00005000 when there are no transactions', async () => {
    const feeRate = await client.transactions.estimateFee(10)
    expect(feeRate).toStrictEqual(0.00005000)
  })
})
