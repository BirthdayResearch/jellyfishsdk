import BigNumber from 'bignumber.js'
import { CTransaction, Transaction } from '../../src'
import { OP_CODES, OP_PUSHDATA } from '../../src/script'
import { expectHexBufferToObject, expectObjectToHexBuffer } from './index'

describe('CTransaction', () => {
  it('should map class getter to data', () => {
    const data: Transaction = {
      version: 0x00000004,
      vin: [
        {
          index: 0,
          script: {
            stack: []
          },
          sequence: 4294967278,
          txid: 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f'
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
          dct_id: 0x00
        }
      ],
      lockTime: 0x00000011
    }
    const transaction = new CTransaction(data)

    expect(transaction.version).toBe(data.version)

    expect(transaction.vin.length).toBe(data.vin.length)
    expect(transaction.vin[0].txid).toBe(data.vin[0].txid)
    expect(transaction.vin[0].index).toBe(data.vin[0].index)
    expect(transaction.vin[0].script.stack).toBe(data.vin[0].script.stack)
    expect(transaction.vin[0].sequence).toBe(data.vin[0].sequence)

    expect(transaction.vout.length).toBe(data.vout.length)
    expect(transaction.vout[0].value).toBe(data.vout[0].value)
    expect(transaction.vout[0].script.stack).toBe(data.vout[0].script.stack)

    expect(transaction.lockTime).toBe(data.lockTime)
  })

  describe('P2WPKH (UNSIGNED)', () => {
    const hex = '0400000002fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f0000000000eeffffffef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a0100000000ffffffff02202cb206000000001976a9148280b37df378db99f66f85c95a783a76ac7a6d5988ac009093510d000000001976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac0011000000'
    const data: Transaction = {
      version: 0x00000004,
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
          },
          dct_id: 0x00
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
          dct_id: 0x00
        }
      ],
      lockTime: 0x00000011
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CTransaction(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CTransaction(data))
    })
  })

  describe('P2SH-P2WPKH (UNSIGNED)', () => {
    const hex = '0400000001db6b1b20aa0fd7b23880be2ecbd4a98130974cf4748fb66092ac4d3ceb1a54770100000000feffffff02b8b4eb0b000000001976a914a457b684d7f0d539a46a45bbc043f35b59d0d96388ac000008af2f000000001976a914fd270b1ee6abcaea97fea7ad0402e8bd8ad6d77c88ac0092040000'
    const data: Transaction = {
      version: 0x00000004,
      vin: [
        {
          index: 1,
          script: {
            stack: []
          },
          sequence: 0xfffffffe,
          txid: 'db6b1b20aa0fd7b23880be2ecbd4a98130974cf4748fb66092ac4d3ceb1a5477'
        }
      ],
      vout: [
        {
          script: {
            stack: [
              OP_CODES.OP_DUP,
              OP_CODES.OP_HASH160,
              OP_CODES.OP_PUSHDATA(Buffer.from('a457b684d7f0d539a46a45bbc043f35b59d0d963', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('1.999966'),
          dct_id: 0x00
        },
        {
          script: {
            stack: [
              OP_CODES.OP_DUP,
              OP_CODES.OP_HASH160,
              OP_CODES.OP_PUSHDATA(Buffer.from('fd270b1ee6abcaea97fea7ad0402e8bd8ad6d77c', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('8'),
          dct_id: 0x00
        }
      ],
      lockTime: 1170
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CTransaction(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CTransaction(data))
    })
  })

  describe('P2WSH (UNSIGNED)', () => {
    const hex = '0400000002fe3dc9208094f3ffd12645477b3dc56f60ec4fa8e6f5d67c565d1c6b9216b36e0000000000ffffffff0815cf020f013ed6cf91d29f4202e8a58726b1ac6c79da47c23d1bee0a6925f80000000000ffffffff0100f2052a010000001976a914a30741f8145e5acadf23f751864167f32e0963f788ac0000000000'
    const data: Transaction = {
      version: 0x00000004,
      vin: [
        {
          index: 0,
          script: {
            stack: []
          },
          sequence: 0xffffffff,
          txid: 'fe3dc9208094f3ffd12645477b3dc56f60ec4fa8e6f5d67c565d1c6b9216b36e'
        },
        {
          index: 0,
          script: {
            stack: []
          },
          sequence: 0xffffffff,
          txid: '0815cf020f013ed6cf91d29f4202e8a58726b1ac6c79da47c23d1bee0a6925f8'
        }
      ],
      vout: [
        {
          script: {
            stack: [
              OP_CODES.OP_DUP,
              OP_CODES.OP_HASH160,
              new OP_PUSHDATA(Buffer.from('a30741f8145e5acadf23f751864167f32e0963f7', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('50'),
          dct_id: 0x00
        }
      ],
      lockTime: 0
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CTransaction(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CTransaction(data))
    })
  })

  describe('P2SH-P2WSH (UNSIGNED)', () => {
    const hex = '040000000136641869ca081e70f394c6948e8af409e18b619df2ed74aa106c1ca29787b96e0100000000ffffffff0200e9a435000000001976a914389ffce9cd9ae88dcc0631e88a821ffdbe9bfe2688ac00c0832f05000000001976a9147480a33f950689af511e6e84c138dbbd3c3ee41588ac0000000000'
    const data: Transaction = {
      version: 0x00000004,
      vin: [
        {
          index: 0x00000001,
          script: {
            stack: []
          },
          sequence: 0xffffffff,
          txid: '36641869ca081e70f394c6948e8af409e18b619df2ed74aa106c1ca29787b96e'
        }
      ],
      vout: [
        {
          script: {
            stack: [
              OP_CODES.OP_DUP,
              OP_CODES.OP_HASH160,
              new OP_PUSHDATA(Buffer.from('389ffce9cd9ae88dcc0631e88a821ffdbe9bfe26', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('0x0000000035a4e900').dividedBy('100000000'),
          dct_id: 0x00
        },
        {
          script: {
            stack: [
              OP_CODES.OP_DUP,
              OP_CODES.OP_HASH160,
              new OP_PUSHDATA(Buffer.from('7480a33f950689af511e6e84c138dbbd3c3ee415', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('0x00000000052f83c0').dividedBy('100000000'),
          dct_id: 0x00
        }
      ],
      lockTime: 0x00000000
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CTransaction(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CTransaction(data))
    })
  })
})
