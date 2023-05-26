import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { TransferDomain, CTransferDomain } from '../../../../src/script/dftx/dftx_account'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * DVMTokenToEVM : {
     *  type: 1,
     *  from: { '2N8pVrM8gVsp4wMaE14U2WHvKar1jf2zNq9': '5@DFI' },
     *  to: { '0x3ceeb32b5abd5734ac3b85bac8fa9f137f69806f': '5@DFI' }
     * }
     */
    '6a4c514466547838010117a914aad4dafbcf8c7f5f02ba5e67e101e0bf1ffdc8558701000000000065cd1d00000000011660143ceeb32b5abd5734ac3b85bac8fa9f137f69806f01000000000065cd1d00000000',
    /**
     * EVMToDVMToken : {
     *  type: 2,
     *  from: { '0xea83daf487492796ae969d212443f13906e66740': '5@DFI' },
     *  to: { '2N7KLgkCu7PDNwxCEKnaY7qQSrzcHb2VHNY': '5@DFI' }
     * }
     */
    '6a4c5144665478380201166014ea83daf487492796ae969d212443f13906e6674001000000000065cd1d000000000117a9149a59040582af240bb1b91ec1ca48226d2afd84f38701000000000065cd1d00000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x38)
  })
})

const header = '6a4c514466547838' // OP_RETURN(0x6a) (length 76 = 0x4c) CDfTx.SIGNATURE(0x44665478) CTransferDomain.OP_CODE(0x38)
// TransferDomain.type (0x01)
// TransferDomain.from (0x0117a914aad4dafbcf8c7f5f02ba5e67e101e0bf1ffdc8558701000000000065cd1d00000000)
// TransferDomain.to (0x011660143ceeb32b5abd5734ac3b85bac8fa9f137f69806f01000000000065cd1d00000000)
const evmInData = '010117a914aad4dafbcf8c7f5f02ba5e67e101e0bf1ffdc8558701000000000065cd1d00000000011660143ceeb32b5abd5734ac3b85bac8fa9f137f69806f01000000000065cd1d00000000'
const evmInTransferDomain: TransferDomain = {
  type: 1,
  from: [{
    balances: [
      {
        amount: new BigNumber('5'), token: 0
      }
    ],
    script: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('aad4dafbcf8c7f5f02ba5e67e101e0bf1ffdc855'),
        OP_CODES.OP_EQUAL
      ]
    }
  }],
  to: [{
    balances: [
      {
        amount: new BigNumber('5'), token: 0
      }
    ],
    script: {
      stack: [
        OP_CODES.OP_16,
        OP_CODES.OP_PUSHDATA_HEX_LE('3ceeb32b5abd5734ac3b85bac8fa9f137f69806f')
      ]
    }
  }]
}

it('should craft dftx with OP_CODES._() for DVMToEVMToken', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_TRANSFER_DOMAIN(evmInTransferDomain)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + evmInData)
})

describe('Composable DVMToEVMToken', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(evmInData, 'hex'))
    const composable = new CTransferDomain(buffer)
    expect(composable.toObject()).toStrictEqual(evmInTransferDomain)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CTransferDomain(evmInTransferDomain)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(evmInData)
  })
})

// TransferDomain.type (0x02)
// TransferDomain.from (0x0201166014ea83daf487492796ae969d212443f13906e6674001000000000065cd1d00000000)
// TransferDomain.to (0x0117a9149a59040582af240bb1b91ec1ca48226d2afd84f38701000000000065cd1d00000000)
const evmOutData = '0201166014ea83daf487492796ae969d212443f13906e6674001000000000065cd1d000000000117a9149a59040582af240bb1b91ec1ca48226d2afd84f38701000000000065cd1d00000000'
const evmOutTransferDomain: TransferDomain = {
  type: 2,
  from: [{
    balances: [
      {
        amount: new BigNumber('5'), token: 0
      }
    ],
    script: {
      stack: [
        OP_CODES.OP_16,
        OP_CODES.OP_PUSHDATA_HEX_LE('ea83daf487492796ae969d212443f13906e66740')
      ]
    }
  }],
  to: [{
    balances: [
      {
        amount: new BigNumber('5'), token: 0
      }
    ],
    script: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('9a59040582af240bb1b91ec1ca48226d2afd84f3'),
        OP_CODES.OP_EQUAL
      ]
    }
  }]
}

it('should craft dftx with OP_CODES._() for EVMToDVMToken', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_TRANSFER_DOMAIN(evmOutTransferDomain)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + evmOutData)
})

describe('Composable EVMToDVMToken', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(evmOutData, 'hex'))
    const composable = new CTransferDomain(buffer)
    expect(composable.toObject()).toStrictEqual(evmOutTransferDomain)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CTransferDomain(evmOutTransferDomain)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(evmOutData)
  })
})
