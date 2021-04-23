import BigNumber from 'bignumber.js'
import { DeFiTransactionConstants, SIGHASH, Transaction, TransactionSigner, Vout } from '../../src'
import { OP_CODES, OP_PUSHDATA } from '../../src/script'
import { getEllipticPairFromPrivateKey } from '@defichain/jellyfish-crypto'

describe('sign transaction', () => {
  const transaction: Transaction = {
    version: DeFiTransactionConstants.Version,
    vin: [
      {
        index: 0,
        script: {
          stack: []
        },
        sequence: 0xffffffff,
        txid: 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f'
      }
    ],
    vout: [
      {
        value: new BigNumber('1000.1'),
        script: {
          stack: [
            OP_CODES.OP_0,
            new OP_PUSHDATA(Buffer.from('3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159', 'hex'), 'little')
          ]
        },
        dct_id: 0x00
      }
    ],
    lockTime: 0x00000000
  }
  const privateKey = Buffer.from('619c335025c7f4012e556c2a58b2506e30b8511b53ade95ea316fd8c3286feb9', 'hex')
  // const publicKey = Buffer.from('025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357', 'hex')
  const prevout: Vout = {
    script: {
      // 00141d0f172a0ecb48aee1be1f2687d2963ae33f71a1
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
      ]
    },
    value: new BigNumber('1000'),
    dct_id: 0x00
  }
  const keyPair = getEllipticPairFromPrivateKey(privateKey)
  const inputOption = {
    prevout: prevout,
    ellipticPair: keyPair
  }

  it('should sign a P2WSH transaction', async () => {
    const signed = await TransactionSigner.sign(transaction, [{
      prevout: prevout,
      ellipticPair: keyPair
    }])

    expect(signed.version).toBe(DeFiTransactionConstants.Version)
    expect(signed.marker).toBe(DeFiTransactionConstants.WitnessMarker)
    expect(signed.flag).toBe(DeFiTransactionConstants.WitnessFlag)

    expect(signed.vin.length).toBe(1)
    expect(signed.vout.length).toBe(1)

    expect(signed.witness.length).toBe(1)
    expect(signed.witness[0].scripts.length).toBe(2)

    expect(signed.lockTime).toBe(0x00000000)
  })

  describe('validate', () => {
    it('should fail as vin.length != inputOptions.length', async () => {
      return await expect(TransactionSigner.sign(transaction, [inputOption, inputOption], {
        sigHashType: SIGHASH.NONE
      })).rejects.toThrow('vin.length and inputOptions.length must match')
    })

    it('should fail if version is different from DeFiTransactionConstants.Version', async () => {
      const txn = {
        ...transaction,
        version: 1
      }
      return await expect(TransactionSigner.sign(txn, [inputOption]))
        .rejects.toThrow('option.validate.version = true - trying to sign a txn 1 different from 4 is not supported')
    })

    it('should succeed if version is different from DeFiTransactionConstants.Version', async () => {
      const txn = {
        ...transaction,
        version: 1
      }
      const signed = await TransactionSigner.sign(txn, [inputOption], {
        validate: {
          version: false
        }
      })
      expect(signed.version).toBe(1)
    })

    it('should fail if lockTime is not set to 0', async () => {
      const txn: Transaction = {
        ...transaction,
        lockTime: 1
      }
      return await expect(TransactionSigner.sign(txn, [inputOption]))
        .rejects.toThrow('option.validate.lockTime = true - lockTime: 1 must be zero')
    })

    it('should succeed if lockTime is not set to 0', async () => {
      const txn: Transaction = {
        ...transaction,
        lockTime: 1000
      }
      const signed = await TransactionSigner.sign(txn, [inputOption], {
        validate: {
          lockTime: false
        }
      })
      expect(signed.lockTime).toBe(1000)
    })
  })

  it('should fail if not using SIGHASH.ALL as it is not yet supported', async () => {
    return await expect(TransactionSigner.sign(transaction, [inputOption], {
      sigHashType: SIGHASH.NONE
    })).rejects.toThrow('currently only SIGHASH.ALL is supported')
  })
})
