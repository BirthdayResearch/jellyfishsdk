import { BigNumber } from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { CTransactionSegWit, TransactionSegWit, DeFiTransaction } from '../src'
import { OP_CODES, OP_PUSHDATA } from '../src/script'

it('should be able to use DeFiTransaction constants to craft Transaction', () => {
  const hex = '04000000000101ef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a0000000000ffffffff0100e1f505000000001600143bde42dbee7e4dbe6a21b2d50ce2f0167faa815900010000000000'
  const data: TransactionSegWit = {
    version: DeFiTransaction.Version,
    marker: DeFiTransaction.WitnessMarker,
    flag: DeFiTransaction.WitnessFlag,
    vin: [
      {
        index: 0,
        script: {
          stack: []
        },
        sequence: 0xffffffff,
        txid: 'ef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a'
      }
    ],
    vout: [
      {
        script: {
          stack: [
            OP_CODES.OP_0,
            new OP_PUSHDATA(Buffer.from('3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159', 'hex'), 'little')
          ]
        },
        value: new BigNumber('1'),
        dct_id: 0x00
      }
    ],
    witness: [
      {
        scripts: [
          {
            hex: ''
          }
        ]
      }
    ],
    lockTime: 0x00000000
  }

  const buffer = new SmartBuffer()
  new CTransactionSegWit(data).toBuffer(buffer)
  expect(buffer.toBuffer().toString('hex')).toBe(hex)
})
