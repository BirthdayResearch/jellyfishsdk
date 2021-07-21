import BigNumber from 'bignumber.js'
import { OP_CODES, OP_PUSHDATA, SIGHASH, Transaction, Vout } from '@defichain/jellyfish-transaction'
import { Elliptic, HASH160, SHA256 } from '@defichain/jellyfish-crypto'
import { TransactionSigner } from '../../src'

describe('sign single input', () => {
  const transaction: Transaction = {
    version: 0x00000004,
    vin: [
      {
        index: 0,
        script: {
          stack: []
        },
        sequence: 4294967278,
        txid: '9f96ade4b41d5433f4eda31e1738ec2b36f6e7d1420d94a6af99801a88f7f7ff'
      },
      {
        index: 1,
        script: {
          stack: []
        },
        sequence: 4294967295,
        txid: '8ac60eb9575db5b2d987e29f301b5b819ea83a5c6579d282d189cc04b8e151ef'
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
        },
        tokenId: 0x00
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
        },
        tokenId: 0x00
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
    value: new BigNumber('6'),
    tokenId: 0x00
  }
  const keyPair = Elliptic.fromPrivKey(privateKey)

  it('should sign single input', async () => {
    const witness = await TransactionSigner.signInput(transaction, 1, {
      prevout: prevout,
      publicKey: async () => await keyPair.publicKey(),
      sign: async (hash) => await keyPair.sign(hash)
    }, SIGHASH.ALL)

    expect(witness.scripts.length).toStrictEqual(2)
    expect(witness.scripts[0].hex).toStrictEqual(
      '30440220529a7ad524c004d68dc331cc2a5c339051da00d73c49cca28661eb1e44f73ad002200ac99a3fec7030528839ac33f7870c462d542d57662ae3f79966a997a0e9115a01'
    )
    expect(witness.scripts[1].hex).toStrictEqual(
      '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
    )
  })

  it('should sign with same witnessScript getting the same signature', async () => {
    const witness = await TransactionSigner.signInput(transaction, 1, {
      prevout: prevout,
      publicKey: async () => await keyPair.publicKey(),
      sign: async (hash) => await keyPair.sign(hash),
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

    expect(witness.scripts.length).toStrictEqual(2)
    expect(witness.scripts[0].hex).toStrictEqual(
      '30440220529a7ad524c004d68dc331cc2a5c339051da00d73c49cca28661eb1e44f73ad002200ac99a3fec7030528839ac33f7870c462d542d57662ae3f79966a997a0e9115a01'
    )
    expect(witness.scripts[1].hex).toStrictEqual(
      '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
    )
  })

  it('should sign with different witness script getting different signature', async () => {
    const witness = await TransactionSigner.signInput(transaction, 1, {
      prevout: prevout,
      publicKey: async () => await keyPair.publicKey(),
      sign: async (hash) => await keyPair.sign(hash),
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

    expect(witness.scripts.length).toStrictEqual(2)
    expect(witness.scripts[0].hex).not.toStrictEqual(
      '304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee01'
    )
    expect(witness.scripts[1].hex).toStrictEqual(
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
        value: new BigNumber('6'),
        tokenId: 0x00
      },
      publicKey: async () => await keyPair.publicKey(),
      sign: async (hash) => await keyPair.sign(hash)
    }, SIGHASH.ALL))
      .rejects.toThrow('witnessScript required, only P2WPKH can be guessed')
  })

  it('should fail as isV0P2WPKH cannot match provided prevout ', async () => {
    return await expect(TransactionSigner.signInput(transaction, 1, {
      prevout: {
        script: {
          stack: [
            OP_CODES.OP_0,
            // hash is invalid
            OP_CODES.OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a0', 'hex'), 'little')
          ]
        },
        value: new BigNumber('6'),
        tokenId: 0x00
      },
      publicKey: async () => await keyPair.publicKey(),
      sign: async (hash) => await keyPair.sign(hash)
    }, SIGHASH.ALL))
      .rejects.toThrow('invalid input option - attempting to sign a mismatch vout and publicKey is not allowed')
  })

  describe('SIGHASH for consistency should err-out as they are not implemented', () => {
    it('should err SIGHASH.NONE', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        publicKey: async () => await keyPair.publicKey(),
        sign: async (hash) => await keyPair.sign(hash)
      }, SIGHASH.NONE)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })

    it('should err SIGHASH.SINGLE', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        publicKey: async () => await keyPair.publicKey(),
        sign: async (hash) => await keyPair.sign(hash)
      }, SIGHASH.SINGLE)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })

    it('should err SIGHASH.ANYONECANPAY', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        publicKey: async () => await keyPair.publicKey(),
        sign: async (hash) => await keyPair.sign(hash)
      }, SIGHASH.ANYONECANPAY)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })

    it('should err SIGHASH.ALL_ANYONECANPAY', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        publicKey: async () => await keyPair.publicKey(),
        sign: async (hash) => await keyPair.sign(hash)
      }, SIGHASH.ALL_ANYONECANPAY)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })

    it('should err SIGHASH.NONE_ANYONECANPAY', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        publicKey: async () => await keyPair.publicKey(),
        sign: async (hash) => await keyPair.sign(hash)
      }, SIGHASH.NONE_ANYONECANPAY)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })

    it('should err SIGHASH.SINGLE_ANYONECANPAY', async () => {
      return await expect(TransactionSigner.signInput(transaction, 1, {
        prevout: prevout,
        publicKey: async () => await keyPair.publicKey(),
        sign: async (hash) => await keyPair.sign(hash)
      }, SIGHASH.SINGLE_ANYONECANPAY)).rejects.toThrow('currently only SIGHASH.ALL is supported')
    })
  })
})
