import BigNumber from 'bignumber.js'
import { SIGHASH, Transaction, TransactionSigner, Vout, DeFiTransaction } from '../src'
import { OP_CODES, OP_PUSHDATA } from '../src/script'
import { getEllipticPairFromPrivateKey, HASH160, SHA256 } from '@defichain/jellyfish-crypto'

// Test vector mostly taken from: https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki

describe('sign single input', () => {
  // 0100000002fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f0000000000eeffffffef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a0100000000ffffffff02202cb206000000001976a9148280b37df378db99f66f85c95a783a76ac7a6d5988ac9093510d000000001976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac11000000
  const transaction: Transaction = {
    version: 0x00000001,
    vin: [
      {
        index: 0,
        script: {
          stack: []
        },
        sequence: 4294967278,
        txid: 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f'
      },
      {
        index: 1,
        script: {
          stack: []
        },
        sequence: 4294967295,
        txid: 'ef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a'
      }
    ],
    vout: [
      {
        value: new BigNumber('1.1234'),
        script: {
          stack: [
            OP_CODES.OP_DUP,
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('8280b37df378db99f66f85c95a783a76ac7a6d59', 'hex'), 'little'),
            OP_CODES.OP_EQUALVERIFY,
            OP_CODES.OP_CHECKSIG
          ]
        }
      },
      {
        value: new BigNumber('2.2345'),
        script: {
          stack: [
            OP_CODES.OP_DUP,
            OP_CODES.OP_HASH160,
            new OP_PUSHDATA(Buffer.from('3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159', 'hex'), 'little'),
            OP_CODES.OP_EQUALVERIFY,
            OP_CODES.OP_CHECKSIG
          ]
        }
      }
    ],
    lockTime: 0x00000011
  }
  const privateKey = Buffer.from('619c335025c7f4012e556c2a58b2506e30b8511b53ade95ea316fd8c3286feb9', 'hex')
  const publicKey = Buffer.from('025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357', 'hex')
  const prevout: Vout = {
    script: {
      // 00141d0f172a0ecb48aee1be1f2687d2963ae33f71a1
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
      ]
    },
    value: new BigNumber('6')
  }
  const keyPair = getEllipticPairFromPrivateKey(privateKey)

  it('should sign single input', async () => {
    const witness = await TransactionSigner.signInput(transaction, 1, {
      prevout: prevout,
      ellipticPair: keyPair
    }, SIGHASH.ALL)

    expect(witness.scripts.length).toBe(2)
    expect(witness.scripts[0].hex).toBe(
      '304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee01'
    )
    expect(witness.scripts[1].hex).toBe(
      '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
    )
  })

  it('should sign with same witnessScript getting the same signature', async () => {
    const witness = await TransactionSigner.signInput(transaction, 1, {
      prevout: prevout,
      ellipticPair: keyPair,
      witnessScript: {
        stack: [
          OP_CODES.OP_DUP,
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA(HASH160(publicKey), 'little'),
          OP_CODES.OP_EQUALVERIFY,
          OP_CODES.OP_CHECKSIG
        ]
      }
    }, SIGHASH.ALL)

    expect(witness.scripts.length).toBe(2)
    expect(witness.scripts[0].hex).toBe(
      '304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee01'
    )
    expect(witness.scripts[1].hex).toBe(
      '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
    )
  })

  it('should sign with different witness script getting different signature', async () => {
    const witness = await TransactionSigner.signInput(transaction, 1, {
      prevout: prevout,
      ellipticPair: keyPair,
      witnessScript: {
        stack: [
          OP_CODES.OP_DUP,
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA(SHA256(publicKey), 'little'),
          OP_CODES.OP_EQUALVERIFY,
          OP_CODES.OP_CHECKSIG
        ]
      }
    }, SIGHASH.ALL)

    expect(witness.scripts.length).toBe(2)
    expect(witness.scripts[0].hex).not.toBe(
      '304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee01'
    )
    expect(witness.scripts[1].hex).toBe(
      '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
    )
  })

  it('should fail as P2WSH cannot be guessed', async () => {
    return await expect(TransactionSigner.signInput(transaction, 1, {
      prevout: {
        script: {
          stack: [
            OP_CODES.OP_0,
            OP_CODES.OP_PUSHDATA(Buffer.from('1d1a0ecb48aee1be1f2687d2963ae33f77d2963ae33f71a187d2963ae33f71a1', 'hex'), 'little')
          ]
        },
        value: new BigNumber('6')
      },
      ellipticPair: keyPair
    }, SIGHASH.ALL))
      .rejects.toThrow('witnessScript required, only P2WPKH can be guessed')
  })

  describe('SIGHASH for consistency should err-out as they are not implemented', () => {
    it('should err SIGHASH.NONE', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        ellipticPair: keyPair
      }, SIGHASH.NONE)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })

    it('should err SIGHASH.SINGLE', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        ellipticPair: keyPair
      }, SIGHASH.SINGLE)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })

    it('should err SIGHASH.ANYONECANPAY', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        ellipticPair: keyPair
      }, SIGHASH.ANYONECANPAY)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })

    it('should err SIGHASH.ALL_ANYONECANPAY', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        ellipticPair: keyPair
      }, SIGHASH.ALL_ANYONECANPAY)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })

    it('should err SIGHASH.NONE_ANYONECANPAY', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        ellipticPair: keyPair
      }, SIGHASH.NONE_ANYONECANPAY)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })

    it('should err SIGHASH.SINGLE_ANYONECANPAY', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        ellipticPair: keyPair
      }, SIGHASH.SINGLE_ANYONECANPAY)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })
  })
})

describe('sign transaction', () => {
  const transaction: Transaction = {
    version: DeFiTransaction.Version,
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
        }
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
    value: new BigNumber('1000')
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

    expect(signed.version).toBe(DeFiTransaction.Version)
    expect(signed.marker).toBe(DeFiTransaction.WitnessMarker)
    expect(signed.flag).toBe(DeFiTransaction.WitnessFlag)

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

    it('should fail if version is different from DeFiTransaction.Version', async () => {
      const txn = {
        ...transaction,
        version: 1
      }
      return await expect(TransactionSigner.sign(txn, [inputOption]))
        .rejects.toThrow('option.validate.version = true - trying to sign a txn 1 different from 4 is not supported')
    })

    it('should succeed if version is different from DeFiTransaction.Version', async () => {
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
