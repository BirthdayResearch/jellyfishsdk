import { SmartBuffer } from 'smart-buffer'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CFutureSwap, FutureSwap, OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * FutureSwap : {
     *   owner: 'bcrt1q3pn27msy2h35khh5aj63kp766nj3gvtewacw5z',
     *   source: '1@TSLA',
     *   destination: 0,
     *   withdraw: false
     * }
     */
    '6a2a44665478511600148866af6e0455e34b5ef4ecb51b07dad4e51431790200e1f505000000000000000000',
    /**
     * FutureSwap : {
     *   owner: 'bcrt1qm0sm7u3uhskw27295cqavkpff44s8232720gdn',
     *   source: '1@DUSD',
     *   destination: 2,
     *   withdraw: false
     * }
     */
    '6a2a4466547851160014dbe1bf723cbc2ce57945a601d658294d6b03aa2a0400e1f505000000000200000000'
    /**
     * FutureSwap : {
     *   owner: 'bcrt1q3pn27msy2h35khh5aj63kp766nj3gvtewacw5z',
     *   source: '1@TSLA',
     *   destination: 0,
     *   withdraw: true
     * }
     */
    // '6a2a44665478511600148866af6e0455e34b5ef4ecb51b07dad4e51431790200e1f505000000000000000000'
    /**
     * FutureSwap : {
     *   owner: 'bcrt1q3pn27msy2h35khh5aj63kp766nj3gvtewacw5z',
     *   source: '1@DUSD',
     *   destination: 0,
     *   withdraw: true
     * }
     */
    // '6a2a44665478511600148866af6e0455e34b5ef4ecb51b07dad4e51431790200e1f505000000000000000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x51)
  })
})

const header = '6a2a4466547851' // OP_RETURN(0x6a) (length 42 = 0x2a) CDfTx.SIGNATURE(0x44665478) CCloseVault.OP_CODE(0x51)
// FutureSwap.owner (0x1600148866af6e0455e34b5ef4ecb51b07dad4e5143179)
// FutureSwap.source (0x0200e1f50500000000)
// FutureSwap.destination (0x00000000)
// FutureSwap.withdraw (0x00)
const data = '1600148866af6e0455e34b5ef4ecb51b07dad4e51431790200e1f505000000000000000000'
const futureSwap: FutureSwap = {
  owner: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('8866af6e0455e34b5ef4ecb51b07dad4e5143179')
    ]
  },
  source: { token: 2, amount: new BigNumber(1) },
  destination: 0,
  withdraw: false
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_FUTURE_SWAP(futureSwap)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CFutureSwap(buffer)

    expect(composable.toObject()).toStrictEqual(futureSwap)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CFutureSwap(futureSwap)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
