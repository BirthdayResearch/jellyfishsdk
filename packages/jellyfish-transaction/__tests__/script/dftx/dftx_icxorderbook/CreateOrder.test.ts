import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CICXCreateOrder, ICXCreateOrder, ICXOrderType } from '../../../../src/script/dftx/dftx_icxorderbook'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
    * order : {
    *   tokenFrom: '0',
    *   chainTo: 'BTC',
    *   ownerAddress: '2N82JqppeCXR97CbrV18ZyJy4gD6swrcetY',
    *   receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
    *   amountFrom: new BigNumber(15),
    *   orderPrice: new BigNumber(0.01)
    * }
    */
    '6a4c5d4466547831010017a914a21888038057490b84aab333846aa568839520d68721037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941002f685900000000002f68590000000040420f0000000000400b0000',
    /**
     * order : {
     *  chainFrom: 'BTC',
     *  tokenTo: '0',
     *  ownerAddress: '2N7PZSFc5pbqwuXoShQKHzRBARwE7bNkvq8',
     *  amountFrom: new BigNumber(2),
     *  orderPrice: new BigNumber(1000)
     * }
     */
    '6a3c4466547831020017a9149b2552a44b95afa2d435e416f8c16cfd12e97efd870000c2eb0b0000000000c2eb0b0000000000e8764817000000400b0000',
    /**
     * order :  {
     *  tokenFrom: '0',
     *  chainTo: 'BTC',
     *  ownerAddress: '2N7PZSFc5pbqwuXoShQKHzRBARwE7bNkvq8',
     *  receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
     *  amountFrom: new BigNumber(15),
     *  orderPrice: new BigNumber(0.01)
     * }
     */
    '6a4c5d4466547831010017a9149b2552a44b95afa2d435e416f8c16cfd12e97efd8721037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941002f685900000000002f68590000000040420f0000000000400b0000'

  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x31)
  })
})

describe('CreateOrder with receivePubkey', () => {
  const header = '6a4c5d4466547831' // OP_RETURN PUSH_DATA(44665478, 31)
  const data = '010017a914a21888038057490b84aab333846aa568839520d68721037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941002f685900000000002f68590000000040420f0000000000400b0000'
  const createOrder: ICXCreateOrder = {
    orderType: ICXOrderType.INTERNAL,
    tokenId: 0,
    ownerAddress: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('a21888038057490b84aab333846aa568839520d6'),
        OP_CODES.OP_EQUAL
      ]
    },
    receivePubkey: '037f9563f30c609b19fd435a19b8bde7d6db703012ba1aba72e9f42a87366d1941',
    amountFrom: new BigNumber(15),
    orderPrice: new BigNumber(0.01),
    expiry: 2880
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_ICX_CREATE_ORDER(createOrder)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CICXCreateOrder(buffer)
      expect(composable.toObject()).toStrictEqual(createOrder)
    })
  })

  it('should compose from composable to buffer', () => {
    const composable = new CICXCreateOrder(createOrder)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})

describe('CreateOrder without receivePubkey', () => {
  const header = '6a3c4466547831' // OP_RETURN PUSH_DATA(44665478, 31)
  const data = '020017a9149b2552a44b95afa2d435e416f8c16cfd12e97efd870000c2eb0b0000000000c2eb0b0000000000e8764817000000400b0000'
  const createOrder: ICXCreateOrder = {
    orderType: ICXOrderType.EXTERNAL,
    tokenId: 0,
    ownerAddress: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('9b2552a44b95afa2d435e416f8c16cfd12e97efd'),
        OP_CODES.OP_EQUAL
      ]
    },
    amountFrom: new BigNumber(2),
    orderPrice: new BigNumber(1000),
    expiry: 2880
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_ICX_CREATE_ORDER(createOrder)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CICXCreateOrder(buffer)
      expect(composable.toObject()).toStrictEqual(createOrder)
    })
  })

  it('should compose from composable to buffer', () => {
    const composable = new CICXCreateOrder(createOrder)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
