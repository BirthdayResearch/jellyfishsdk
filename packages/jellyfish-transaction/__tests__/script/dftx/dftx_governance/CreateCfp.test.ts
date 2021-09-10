import { SmartBuffer } from 'smart-buffer'
import {
  CCreateCfp, CreateCfp
} from '../../../../src/script/dftx/dftx_governance'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4b44665478650117a9148b5401d88a3d4e54fc701663dd99a5ab792af0a48700e40b5402000000022354657374696e67206e657720636f6d6d756e6974792066756e642070726f706f73616c'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x65)
  })
})

describe('createCfp', () => {
  const header = '6a4b4466547865' // OP_RETURN(0x6a) OP_PUSHDATA1(0x4b) (length 68 = 0x44) CDfTx.SIGNATURE(0x44665478) CreateProposal.OP_CODE(0x65)
  const data = '0117a9148b5401d88a3d4e54fc701663dd99a5ab792af0a48700e40b5402000000022354657374696e67206e657720636f6d6d756e6974792066756e642070726f706f73616c' // CreateProposal.type(0x01) CreateProposal.address (0x17a9148b5401d88a3d4e54fc701663dd99a5ab792af0a487) CreateProposal.amount(0x00e40b5402000000) CreateProposal.cycles(0x02) CreateProposal.title[BE](0x2354657374696e67206e657720636f6d6d756e6974792066756e642070726f706f73616c)
  const CreateProposal: CreateCfp = {
    type: 0x01,
    title: 'Testing new community fund proposal',
    amount: new BigNumber(100),
    address: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('8b5401d88a3d4e54fc701663dd99a5ab792af0a4'),
        OP_CODES.OP_EQUAL
      ]
    },
    cycles: 2
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_CREATE_CFP(CreateProposal)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CCreateCfp(buffer)

      expect(composable.toObject()).toStrictEqual(CreateProposal)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CCreateCfp(CreateProposal)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})
