import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CICXMakeOffer, ICXMakeOffer } from '../../../../src/script/dftx/dftx_icxorderbook'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * offer : {
     * orderTx: b54d69947cb46474cdf75b88880ab003a84a17e5d38ce83d084e44f0ec9ebd4c,
     * amount: new BigNumber(0.1),
     * ownerAddress: 2N5gsroY5KKAtD9ufsF88TZQs6hyZxfCgFE
     * expiry: 20
     * takerFee: new BigNumber(0)
     * }
     */
    '6a4c5244665478324cbd9eecf0444e083de88cd3e5174aa803b00a88885bf7cd7464b47c94694db5809698000000000017a914887b8586ac0c39b0d07e6a479486f32ac4701c538700140000000000000000000000',
    /**
     * offer : {
     * orderTx: 4ad7dfa848c913a02ecf93353eaaea7f6a564db5b74bb2f9b95c9dddf4fab2bf,
     * amount: new BigNumber(100),
     * ownerAddress: 2N2bPUvhmeg752fmQnBujWig2rci4oGgbA3
     * receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5'
     * expiry: 20
     * takerFee: new BigNumber(0)
     * }
     */
    '6a4c734466547832bfb2faf4dd9d5cb9f9b24bb7b54d566a7feaaa3e3593cf2ea013c948a8dfd74a00e40b540200000017a914668960586aad364c3550ef3e944d356d77206eab87210348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5140000000000000000000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x32)
  })
})

describe('MakeOffer', () => {
  const header = '6a4c524466547832' // OP_RETURN PUSH_DATA(44665478, 32)
  const data = '4cbd9eecf0444e083de88cd3e5174aa803b00a88885bf7cd7464b47c94694db5809698000000000017a914887b8586ac0c39b0d07e6a479486f32ac4701c538700140000000000000000000000'
  const makeOffer: ICXMakeOffer = {
    orderTx: 'b54d69947cb46474cdf75b88880ab003a84a17e5d38ce83d084e44f0ec9ebd4c',
    amount: new BigNumber(0.1),
    ownerAddress: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('887b8586ac0c39b0d07e6a479486f32ac4701c53'),
        OP_CODES.OP_EQUAL
      ]
    },
    expiry: 20,
    takerFee: new BigNumber(0)
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_ICX_MAKE_OFFER(makeOffer)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CICXMakeOffer(buffer)
      expect(composable.toObject()).toStrictEqual(makeOffer)
    })
  })

  it('should compose from composable to buffer', () => {
    const composable = new CICXMakeOffer(makeOffer)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})

describe('CreateOrder with receivePubkey', () => {
  const header = '6a4c734466547832' // OP_RETURN PUSH_DATA(44665478, 32)
  const data = 'bfb2faf4dd9d5cb9f9b24bb7b54d566a7feaaa3e3593cf2ea013c948a8dfd74a00e40b540200000017a914668960586aad364c3550ef3e944d356d77206eab87210348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5140000000000000000000000'
  const makeOffer: ICXMakeOffer = {
    orderTx: '4ad7dfa848c913a02ecf93353eaaea7f6a564db5b74bb2f9b95c9dddf4fab2bf',
    amount: new BigNumber(100),
    ownerAddress: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('668960586aad364c3550ef3e944d356d77206eab'),
        OP_CODES.OP_EQUAL
      ]
    },
    receivePubkey: '0348790cb93b203a8ea5ce07279cb209d807b535b2ca8b0988a6f7a6578e41f7a5',
    expiry: 20,
    takerFee: new BigNumber(0)
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_ICX_MAKE_OFFER(makeOffer)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CICXMakeOffer(buffer)
      expect(composable.toObject()).toStrictEqual(makeOffer)
    })
  })

  it('should compose from composable to buffer', () => {
    const composable = new CICXMakeOffer(makeOffer)
    const buffer = new SmartBuffer()

    composable.toBuffer(buffer)
    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
