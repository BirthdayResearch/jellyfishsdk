import { Script, Vout, Vin, Transaction, WitnessScript, Witness, TransactionSegWit } from '../src/tx'
import { OP_CODES, OP_PUSHDATA } from '../src/script'
import { CScript, CTransaction, CTransactionSegWit, CVin, CVout, CWitness, CWitnessScript } from '../src/tx_composer'
import { SmartBuffer } from 'smart-buffer'
import { BigNumber } from '@defichain/jellyfish-json'
import { ComposableBuffer } from '../src/buffer/buffer_composer'

// Test vector mostly taken from: https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki

function expectHexBufferToObject<T> (hex: string, data: T, asC: ((buffer: SmartBuffer) => ComposableBuffer<T>)): void {
  const composable = asC(SmartBuffer.fromBuffer(
    Buffer.from(hex, 'hex')
  ))

  expect(composable.toObject()).toEqual(data)
  // parse and stringify due to JSON path inconsistent positioning
  expect(JSON.parse(JSON.stringify(composable.toObject()))).toEqual(
    JSON.parse(JSON.stringify(data))
  )
}

function expectObjectToHexBuffer<T> (data: T, hex: string, asC: ((data: T) => ComposableBuffer<T>)): void {
  const txn = asC(data)

  const buffer = new SmartBuffer()
  txn.toBuffer(buffer)

  expect(buffer.toBuffer().toString('hex')).toBe(hex)
  // parse and stringify due to JSON path inconsistent positioning
  expect(JSON.parse(JSON.stringify(txn.toObject()))).toEqual(
    JSON.parse(JSON.stringify(data))
  )
}

describe('CTransaction', () => {
  describe('P2WPKH (UNSIGNED)', () => {
    const hex = '0100000002fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f0000000000eeffffffef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a0100000000ffffffff02202cb206000000001976a9148280b37df378db99f66f85c95a783a76ac7a6d5988ac9093510d000000001976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac11000000'
    const data: Transaction = {
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

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CTransaction(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CTransaction(data))
    })
  })

  describe('P2SH-P2WPKH (UNSIGNED)', () => {
    const hex = '0100000001db6b1b20aa0fd7b23880be2ecbd4a98130974cf4748fb66092ac4d3ceb1a54770100000000feffffff02b8b4eb0b000000001976a914a457b684d7f0d539a46a45bbc043f35b59d0d96388ac0008af2f000000001976a914fd270b1ee6abcaea97fea7ad0402e8bd8ad6d77c88ac92040000'
    const data: Transaction = {
      version: 0x00000001,
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
              new OP_PUSHDATA(Buffer.from('a457b684d7f0d539a46a45bbc043f35b59d0d963', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('1.999966')
        },
        {
          script: {
            stack: [
              OP_CODES.OP_DUP,
              OP_CODES.OP_HASH160,
              new OP_PUSHDATA(Buffer.from('fd270b1ee6abcaea97fea7ad0402e8bd8ad6d77c', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('8')
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
    const hex = '0100000002fe3dc9208094f3ffd12645477b3dc56f60ec4fa8e6f5d67c565d1c6b9216b36e0000000000ffffffff0815cf020f013ed6cf91d29f4202e8a58726b1ac6c79da47c23d1bee0a6925f80000000000ffffffff0100f2052a010000001976a914a30741f8145e5acadf23f751864167f32e0963f788ac00000000'
    const data: Transaction = {
      version: 0x00000001,
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
          value: new BigNumber('50')
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
    const hex = '010000000136641869ca081e70f394c6948e8af409e18b619df2ed74aa106c1ca29787b96e0100000000ffffffff0200e9a435000000001976a914389ffce9cd9ae88dcc0631e88a821ffdbe9bfe2688acc0832f05000000001976a9147480a33f950689af511e6e84c138dbbd3c3ee41588ac00000000'
    const data: Transaction = {
      version: 0x00000001,
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
          value: new BigNumber('0x0000000035a4e900').dividedBy('100000000')
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
          value: new BigNumber('0x00000000052f83c0').dividedBy('100000000')
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

describe('CVin', () => {
  describe('P2KH (UNSIGNED)', () => {
    const hex = 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f0000000000eeffffff'
    const data: Vin = {
      txid: 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f',
      index: 0x00000000,
      script: {
        stack: []
      },
      sequence: 0xffffffee
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVin(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVin(data))
    })
  })

  describe('P2KH (SIGNED)', () => {
    const hex = 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f00000000494830450221008b9d1dc26ba6a9cb62127b02742fa9d754cd3bebf337f7a55d114c8e5cdd30be022040529b194ba3f9281a99f2b1c0a19c0489bc22ede944ccf4ecbab4cc618ef3ed01eeffffff'
    const data: Vin = {
      txid: 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f',
      index: 0x00000000,
      script: {
        stack: [
          new OP_PUSHDATA(Buffer.from('30450221008b9d1dc26ba6a9cb62127b02742fa9d754cd3bebf337f7a55d114c8e5cdd30be022040529b194ba3f9281a99f2b1c0a19c0489bc22ede944ccf4ecbab4cc618ef3ed01', 'hex'), 'little')
        ]
      },
      sequence: 0xffffffee
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVin(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVin(data))
    })
  })

  describe('P2WPKH (SEGWIT)', () => {
    const hex = 'ef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a0100000000ffffffff'
    const data: Vin = {
      txid: 'ef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a',
      index: 0x00000001,
      script: {
        stack: []
      },
      sequence: 0xffffffff
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVin(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVin(data))
    })
  })

  describe('P2SH-P2WPKH (UNSIGNED)', () => {
    const hex = 'db6b1b20aa0fd7b23880be2ecbd4a98130974cf4748fb66092ac4d3ceb1a54770100000000feffffff'
    const data: Vin = {
      txid: 'db6b1b20aa0fd7b23880be2ecbd4a98130974cf4748fb66092ac4d3ceb1a5477',
      index: 0x00000001,
      script: {
        stack: []
      },
      sequence: 0xfffffffe
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVin(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVin(data))
    })
  })

  describe('P2SH-P2WPKH (SIGNED-SEGWIT)', () => {
    const hex = 'db6b1b20aa0fd7b23880be2ecbd4a98130974cf4748fb66092ac4d3ceb1a5477010000001716001479091972186c449eb1ded22b78e40d009bdf0089feffffff'
    const data: Vin = {
      txid: 'db6b1b20aa0fd7b23880be2ecbd4a98130974cf4748fb66092ac4d3ceb1a5477',
      index: 0x00000001,
      script: {
        stack: [
          new OP_PUSHDATA(Buffer.from('001479091972186c449eb1ded22b78e40d009bdf0089', 'hex'), 'little')
        ]
      },
      sequence: 0xfffffffe
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVin(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVin(data))
    })
  })
})

describe('CVout', () => {
  // 1000 00000000
  // 1000|00000000
  // 1000 DFI BigNumber will automatically be mapped into 8 bytes unsigned.

  describe('should out 1200000000 DFI (MAX SUPPLY)', () => {
    const hex = '00000c3d5d53aa011600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Vout = {
      value: new BigNumber('1200000000.00000000'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      }
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 123456789.01234567 DFI (2bdc545d6b4b87 in BE)', () => {
    const hex = '874b6b5d54dc2b001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Vout = {
      value: new BigNumber('123456789.01234567'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      }
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 1000000 DFI', () => {
    const hex = '00407a10f35a00001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Vout = {
      value: new BigNumber('1000000'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      }
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 1000 DFI', () => {
    const hex = '00e87648170000001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Vout = {
      value: new BigNumber('1000'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      }
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 0.00002000 DFI', () => {
    const hex = 'd0070000000000001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Vout = {
      value: new BigNumber('0.00002'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      }
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 0.00000001 DFI', () => {
    const hex = '01000000000000001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Vout = {
      value: new BigNumber('0.00000001'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      }
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 0.00000000 DFI', () => {
    const hex = '00000000000000001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Vout = {
      value: new BigNumber('0'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      }
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })
})

describe('CScript', () => {
  describe('P2PK', () => {
    const hex = '2321036d5c20fa14fb2f635474c1dc4ef5909d4568e5569b79fc94d3448486e14685f8ac'
    const data: Script = {
      stack: [
        new OP_PUSHDATA(Buffer.from('036d5c20fa14fb2f635474c1dc4ef5909d4568e5569b79fc94d3448486e14685f8', 'hex'), 'little'),
        OP_CODES.OP_CHECKSIG
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })

  describe('P2PKH 1', () => {
    const hex = '1976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac'
    const data: Script = {
      stack: [
        OP_CODES.OP_DUP,
        OP_CODES.OP_HASH160,
        new OP_PUSHDATA(Buffer.from('3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159', 'hex'), 'little'),
        OP_CODES.OP_EQUALVERIFY,
        OP_CODES.OP_CHECKSIG
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })

  describe('P2PKH 2', () => {
    const hex = '1976a914a30741f8145e5acadf23f751864167f32e0963f788ac'
    const data: Script = {
      stack: [
        OP_CODES.OP_DUP,
        OP_CODES.OP_HASH160,
        new OP_PUSHDATA(Buffer.from('a30741f8145e5acadf23f751864167f32e0963f7', 'hex'), 'little'),
        OP_CODES.OP_EQUALVERIFY,
        OP_CODES.OP_CHECKSIG
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })

  describe('P2SH', () => {
    const hex = '17a9144733f37cf4db86fbc2efed2500b4f4e49f31202387'
    const data: Script = {
      stack: [
        OP_CODES.OP_HASH160,
        new OP_PUSHDATA(Buffer.from('4733f37cf4db86fbc2efed2500b4f4e49f312023', 'hex'), 'little'),
        OP_CODES.OP_EQUAL
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })

  describe('P2WPKH', () => {
    const hex = '1600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Script = {
      stack: [
        OP_CODES.OP_0,
        new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })

  describe('P2WSH', () => {
    const hex = '2200205d1b56b63d714eebe542309525f484b7e9d6f686b3781b6f61ef925d66d6f6a0'
    const data: Script = {
      stack: [
        OP_CODES.OP_0,
        new OP_PUSHDATA(Buffer.from('5d1b56b63d714eebe542309525f484b7e9d6f686b3781b6f61ef925d66d6f6a0', 'hex'), 'little')
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })
})

describe('CTransactionSegWit', () => {
  describe('P2WPKH (SIGNED)', () => {
    const hex = '01000000000102fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f00000000494830450221008b9d1dc26ba6a9cb62127b02742fa9d754cd3bebf337f7a55d114c8e5cdd30be022040529b194ba3f9281a99f2b1c0a19c0489bc22ede944ccf4ecbab4cc618ef3ed01eeffffffef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a0100000000ffffffff02202cb206000000001976a9148280b37df378db99f66f85c95a783a76ac7a6d5988ac9093510d000000001976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac000247304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee0121025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee635711000000'
    const data: TransactionSegWit = {
      version: 0x00000001,
      marker: 0x00,
      flag: 0x01,
      vin: [
        {
          index: 0,
          script: {
            stack: [
              new OP_PUSHDATA(Buffer.from('30450221008b9d1dc26ba6a9cb62127b02742fa9d754cd3bebf337f7a55d114c8e5cdd30be022040529b194ba3f9281a99f2b1c0a19c0489bc22ede944ccf4ecbab4cc618ef3ed01', 'hex'), 'little')
            ]
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
          script: {
            stack: [
              OP_CODES.OP_DUP,
              OP_CODES.OP_HASH160,
              new OP_PUSHDATA(Buffer.from('8280b37df378db99f66f85c95a783a76ac7a6d59', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('1.1234')
        },
        {
          script: {
            stack: [
              OP_CODES.OP_DUP,
              OP_CODES.OP_HASH160,
              new OP_PUSHDATA(Buffer.from('3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('2.2345')
        }
      ],
      witness: [
        {
          scripts: []
        },
        {
          scripts: [
            {
              hex: '304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee01'
            },
            {
              hex: '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
            }
          ]
        }
      ],
      lockTime: 0x00000011
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CTransactionSegWit(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CTransactionSegWit(data))
    })
  })

  describe('P2SH-P2WPKH (SIGNED)', () => {
    const hex = '01000000000101db6b1b20aa0fd7b23880be2ecbd4a98130974cf4748fb66092ac4d3ceb1a5477010000001716001479091972186c449eb1ded22b78e40d009bdf0089feffffff02b8b4eb0b000000001976a914a457b684d7f0d539a46a45bbc043f35b59d0d96388ac0008af2f000000001976a914fd270b1ee6abcaea97fea7ad0402e8bd8ad6d77c88ac02473044022047ac8e878352d3ebbde1c94ce3a10d057c24175747116f8288e5d794d12d482f0220217f36a485cae903c713331d877c1f64677e3622ad4010726870540656fe9dcb012103ad1d8e89212f0b92c74d23bb710c00662ad1470198ac48c43f7d6f93a2a2687392040000'
    const data: TransactionSegWit = {
      version: 0x00000001,
      marker: 0x00,
      flag: 0x01,
      vin: [
        {
          index: 1,
          script: {
            stack: [
              new OP_PUSHDATA(Buffer.from('001479091972186c449eb1ded22b78e40d009bdf0089', 'hex'), 'little')
            ]
          },
          sequence: 4294967294,
          txid: 'db6b1b20aa0fd7b23880be2ecbd4a98130974cf4748fb66092ac4d3ceb1a5477'
        }
      ],
      vout: [
        {
          script: {
            stack: [
              OP_CODES.OP_DUP,
              OP_CODES.OP_HASH160,
              new OP_PUSHDATA(Buffer.from('a457b684d7f0d539a46a45bbc043f35b59d0d963', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('0x000000000bebb4b8').dividedBy('100000000')
        },
        {
          script: {
            stack: [
              OP_CODES.OP_DUP,
              OP_CODES.OP_HASH160,
              new OP_PUSHDATA(Buffer.from('fd270b1ee6abcaea97fea7ad0402e8bd8ad6d77c', 'hex'), 'little'),
              OP_CODES.OP_EQUALVERIFY,
              OP_CODES.OP_CHECKSIG
            ]
          },
          value: new BigNumber('0x000000002faf0800').dividedBy('100000000')
        }
      ],
      witness: [
        {
          scripts: [
            {
              hex: '3044022047ac8e878352d3ebbde1c94ce3a10d057c24175747116f8288e5d794d12d482f0220217f36a485cae903c713331d877c1f64677e3622ad4010726870540656fe9dcb01'
            },
            {
              hex: '03ad1d8e89212f0b92c74d23bb710c00662ad1470198ac48c43f7d6f93a2a26873'
            }
          ]
        }
      ],
      lockTime: 1170
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CTransactionSegWit(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CTransactionSegWit(data))
    })
  })

  describe('P2WSH (SIGNED)', () => {
    const hex = '01000000000102fe3dc9208094f3ffd12645477b3dc56f60ec4fa8e6f5d67c565d1c6b9216b36e000000004847304402200af4e47c9b9629dbecc21f73af989bdaa911f7e6f6c2e9394588a3aa68f81e9902204f3fcf6ade7e5abb1295b6774c8e0abd94ae62217367096bc02ee5e435b67da201ffffffff0815cf020f013ed6cf91d29f4202e8a58726b1ac6c79da47c23d1bee0a6925f80000000000ffffffff0100f2052a010000001976a914a30741f8145e5acadf23f751864167f32e0963f788ac000347304402200de66acf4527789bfda55fc5459e214fa6083f936b430a762c629656216805ac0220396f550692cd347171cbc1ef1f51e15282e837bb2b30860dc77c8f78bc8501e503473044022027dc95ad6b740fe5129e7e62a75dd00f291a2aeb1200b84b09d9e3789406b6c002201a9ecd315dd6a0e632ab20bbb98948bc0c6fb204f2c286963bb48517a7058e27034721026dccc749adc2a9d0d89497ac511f760f45c47dc5ed9cf352a58ac706453880aeadab210255a9626aebf5e29c0e6538428ba0d1dcf6ca98ffdf086aa8ced5e0d0215ea465ac00000000'
    const data: TransactionSegWit = {
      version: 0x00000001,
      marker: 0x00,
      flag: 0x01,
      vin: [
        {
          index: 0,
          script: {
            stack: [
              new OP_PUSHDATA(Buffer.from('304402200af4e47c9b9629dbecc21f73af989bdaa911f7e6f6c2e9394588a3aa68f81e9902204f3fcf6ade7e5abb1295b6774c8e0abd94ae62217367096bc02ee5e435b67da201', 'hex'), 'little')
            ]
          },
          sequence: 4294967295,
          txid: 'fe3dc9208094f3ffd12645477b3dc56f60ec4fa8e6f5d67c565d1c6b9216b36e'
        },
        {
          index: 0,
          script: {
            stack: []
          },
          sequence: 4294967295,
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
          value: new BigNumber('0x000000012a05f200').dividedBy('100000000')
        }
      ],
      witness: [
        {
          scripts: []
        },
        {
          scripts: [
            {
              hex: '304402200de66acf4527789bfda55fc5459e214fa6083f936b430a762c629656216805ac0220396f550692cd347171cbc1ef1f51e15282e837bb2b30860dc77c8f78bc8501e503'
            },
            {
              hex: '3044022027dc95ad6b740fe5129e7e62a75dd00f291a2aeb1200b84b09d9e3789406b6c002201a9ecd315dd6a0e632ab20bbb98948bc0c6fb204f2c286963bb48517a7058e2703'
            },
            {
              hex: '21026dccc749adc2a9d0d89497ac511f760f45c47dc5ed9cf352a58ac706453880aeadab210255a9626aebf5e29c0e6538428ba0d1dcf6ca98ffdf086aa8ced5e0d0215ea465ac'
            }
          ]
        }
      ],
      lockTime: 0
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CTransactionSegWit(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CTransactionSegWit(data))
    })
  })

  describe('P2SH-P2WSH (SIGNED)', () => {
    const hex = '0100000000010136641869ca081e70f394c6948e8af409e18b619df2ed74aa106c1ca29787b96e0100000023220020a16b5755f7f6f96dbd65f5f0d6ab9418b89af4b1f14a1bb8a09062c35f0dcb54ffffffff0200e9a435000000001976a914389ffce9cd9ae88dcc0631e88a821ffdbe9bfe2688acc0832f05000000001976a9147480a33f950689af511e6e84c138dbbd3c3ee41588ac080047304402206ac44d672dac41f9b00e28f4df20c52eeb087207e8d758d76d92c6fab3b73e2b0220367750dbbe19290069cba53d096f44530e4f98acaa594810388cf7409a1870ce01473044022068c7946a43232757cbdf9176f009a928e1cd9a1a8c212f15c1e11ac9f2925d9002205b75f937ff2f9f3c1246e547e54f62e027f64eefa2695578cc6432cdabce271502473044022059ebf56d98010a932cf8ecfec54c48e6139ed6adb0728c09cbe1e4fa0915302e022007cd986c8fa870ff5d2b3a89139c9fe7e499259875357e20fcbb15571c76795403483045022100fbefd94bd0a488d50b79102b5dad4ab6ced30c4069f1eaa69a4b5a763414067e02203156c6a5c9cf88f91265f5a942e96213afae16d83321c8b31bb342142a14d16381483045022100a5263ea0553ba89221984bd7f0b13613db16e7a70c549a86de0cc0444141a407022005c360ef0ae5a5d4f9f2f87a56c1546cc8268cab08c73501d6b3be2e1e1a8a08824730440220525406a1482936d5a21888260dc165497a90a15669636d8edca6b9fe490d309c022032af0c646a34a44d1f4576bf6a4a74b67940f8faa84c7df9abe12a01a11e2b4783cf56210307b8ae49ac90a048e9b53357a2354b3334e9c8bee813ecb98e99a7e07e8c3ba32103b28f0c28bfab54554ae8c658ac5c3e0ce6e79ad336331f78c428dd43eea8449b21034b8113d703413d57761b8b9781957b8c0ac1dfe69f492580ca4195f50376ba4a21033400f6afecb833092a9a21cfdf1ed1376e58c5d1f47de74683123987e967a8f42103a6d48b1131e94ba04d9737d61acdaa1322008af9602b3b14862c07a1789aac162102d8b661b0b3302ee2f162b09e07a55ad5dfbe673a9f01d9f0c19617681024306b56ae00000000'
    const data: TransactionSegWit = {
      version: 0x00000001,
      marker: 0x00,
      flag: 0x01,
      vin: [
        {
          index: 1,
          script: {
            stack: [
              new OP_PUSHDATA(Buffer.from('0020a16b5755f7f6f96dbd65f5f0d6ab9418b89af4b1f14a1bb8a09062c35f0dcb54', 'hex'), 'little')
            ]
          },
          sequence: 4294967295,
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
          value: new BigNumber('9')
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
          value: new BigNumber('0.87')
        }
      ],
      witness: [
        {
          scripts: [
            {
              hex: ''
            },
            {
              hex: '304402206ac44d672dac41f9b00e28f4df20c52eeb087207e8d758d76d92c6fab3b73e2b0220367750dbbe19290069cba53d096f44530e4f98acaa594810388cf7409a1870ce01'
            },
            {
              hex: '3044022068c7946a43232757cbdf9176f009a928e1cd9a1a8c212f15c1e11ac9f2925d9002205b75f937ff2f9f3c1246e547e54f62e027f64eefa2695578cc6432cdabce271502'
            },
            {
              hex: '3044022059ebf56d98010a932cf8ecfec54c48e6139ed6adb0728c09cbe1e4fa0915302e022007cd986c8fa870ff5d2b3a89139c9fe7e499259875357e20fcbb15571c76795403'
            },
            {
              hex: '3045022100fbefd94bd0a488d50b79102b5dad4ab6ced30c4069f1eaa69a4b5a763414067e02203156c6a5c9cf88f91265f5a942e96213afae16d83321c8b31bb342142a14d16381'
            },
            {
              hex: '3045022100a5263ea0553ba89221984bd7f0b13613db16e7a70c549a86de0cc0444141a407022005c360ef0ae5a5d4f9f2f87a56c1546cc8268cab08c73501d6b3be2e1e1a8a0882'
            },
            {
              hex: '30440220525406a1482936d5a21888260dc165497a90a15669636d8edca6b9fe490d309c022032af0c646a34a44d1f4576bf6a4a74b67940f8faa84c7df9abe12a01a11e2b4783'
            },
            {
              hex: '56210307b8ae49ac90a048e9b53357a2354b3334e9c8bee813ecb98e99a7e07e8c3ba32103b28f0c28bfab54554ae8c658ac5c3e0ce6e79ad336331f78c428dd43eea8449b21034b8113d703413d57761b8b9781957b8c0ac1dfe69f492580ca4195f50376ba4a21033400f6afecb833092a9a21cfdf1ed1376e58c5d1f47de74683123987e967a8f42103a6d48b1131e94ba04d9737d61acdaa1322008af9602b3b14862c07a1789aac162102d8b661b0b3302ee2f162b09e07a55ad5dfbe673a9f01d9f0c19617681024306b56ae'
            }
          ]
        }
      ],
      lockTime: 0
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CTransactionSegWit(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CTransactionSegWit(data))
    })
  })
})

describe('CWitness', () => {
  describe('0x02 0x47<> 0x27<>', () => {
    const hex = '024730440220032521802a76ad7bf74d0e2c218b72cf0cbc867066e2e53db905ba37f130397e02207709e2188ed7f08f4c952d9d13986da504502b8c3be59617e043552f506c46ff83275163ab68210392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98ac'
    const data: Witness = {
      scripts: [
        {
          hex: '30440220032521802a76ad7bf74d0e2c218b72cf0cbc867066e2e53db905ba37f130397e02207709e2188ed7f08f4c952d9d13986da504502b8c3be59617e043552f506c46ff83'
        },
        {
          hex: '5163ab68210392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98ac'
        }
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitness(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitness(data))
    })
  })

  describe('0x02 0x47<> 0x27<>', () => {
    const hex = '02483045022100f6a10b8604e6dc910194b79ccfc93e1bc0ec7c03453caaa8987f7d6c3413566002206216229ede9b4d6ec2d325be245c5b508ff0339bf1794078e20bfe0babc7ffe683270063ab68210392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98ac'
    const data: Witness = {
      scripts: [
        {
          hex: '3045022100f6a10b8604e6dc910194b79ccfc93e1bc0ec7c03453caaa8987f7d6c3413566002206216229ede9b4d6ec2d325be245c5b508ff0339bf1794078e20bfe0babc7ffe683'
        },
        {
          hex: '0063ab68210392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98ac'
        }
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitness(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitness(data))
    })
  })

  describe('0x07 0x00 0x48<> 0x48<> 0x01<02> 0x21<> 0x21<> 0x95<>', () => {
    const hex =
      '0700' +
      '4830450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e01' +
      '48304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c03959601' +
      '0102' +
      '2102966f109c54e85d3aee8321301136cedeb9fc710fdef58a9de8a73942f8e567c0' +
      '21034ffc99dd9a79dd3cb31e2ab3e0b09e0e67db41ac068c625cd1f491576016c84e' +
      '9552af4830450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e0148304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c0395960175'
    const data: Witness = {
      scripts: [
        {
          hex: ''
        },
        {
          hex: '30450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e01'
        },
        {
          hex: '304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c03959601'
        },
        {
          hex: '02'
        },
        {
          hex: '02966f109c54e85d3aee8321301136cedeb9fc710fdef58a9de8a73942f8e567c0'
        },
        {
          hex: '034ffc99dd9a79dd3cb31e2ab3e0b09e0e67db41ac068c625cd1f491576016c84e'
        },
        {
          hex: '52af4830450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e0148304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c0395960175'
        }
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitness(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitness(data))
    })
  })
})

describe('CWitnessScript', () => {
  describe('len is 71', () => {
    const hex = '47304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee01'
    const data: WitnessScript = {
      hex: '304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee01'
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitnessScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitnessScript(data))
    })
  })

  describe('len is 33', () => {
    const hex = '21025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
    const data: WitnessScript = {
      hex: '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitnessScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitnessScript(data))
    })
  })

  describe('len is 149', () => {
    const hex = '9552af4830450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e0148304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c0395960175'
    const data: WitnessScript = {
      hex: '52af4830450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e0148304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c0395960175'
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitnessScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitnessScript(data))
    })
  })
})
