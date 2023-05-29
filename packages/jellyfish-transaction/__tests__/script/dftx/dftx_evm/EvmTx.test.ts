import { SmartBuffer } from 'smart-buffer'
import { CEvmTx, EvmTx, OP_DEFI_TX } from '../../../../src/script/dftx'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_CODES } from '../../../../src'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
      6a - OP_RETURN
      4c - OP_PUSHDATA1
      74 - length
      44665478 - dftx
      39 - txtype
      6e - length
      f86c808504e3b29200825208946c34cbb9219d8caa428835d2073e8ec88ba0a110880de0b6b3a76400008025a037f41c543402c9b02b35b45ef43ac31a63dcbeba0c622249810ecdec00aee376a05eb2be77eb0c7a1875a53ba15fc6afe246fbffe869157edbde64270e41ba045e0000000000 -- signed evm tx
     */
    '6a4c7444665478396ef86c808504e3b29200825208946c34cbb9219d8caa428835d2073e8ec88ba0a110880de0b6b3a76400008025a037f41c543402c9b02b35b45ef43ac31a63dcbeba0c622249810ecdec00aee376a05eb2be77eb0c7a1875a53ba15fc6afe246fbffe869157edbde64270e41ba045e0000000000',
    '6a4c7444665478396ef86c808504e3b292008252089431aff0f9bd809c09b17859c3167b0ed1965743e3880de0b6b3a76400008026a0a5c6a81fdacf02b1d6e78c132666faee8d9017e12c5a97983e5f998462e5a9c3a018bf23d147bcb6cd009a2c9fa76b28d707b61ed376679d907cecb7c38140bcd90000000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x39)
  })
})

const evmTxData: Array<{ header: string, data: string, evmTx: EvmTx }> = [
  {
    // data with context
    header: '6a4c744466547839', // OP_RETURN(6a) OP_PUSHDATA1(4c) (length 74) CDfTx.SIGNATURE(44665478) CEvmTx.OP_CODE(39)
    data: '6ef86c808504e3b292008252089491fd112728a18d37d27ca2631e19983fb3d1ca72880de0b6b3a76400008026a01115fd8f4a95e31c8ae613b7faaa7ec6be0d90af8c24224d41deb756766c5f0ea01f3d65607ef93230cf3aa091dd78ec310dcdddf81867e89ee2e49dce310455ae',
    evmTx: {
      raw: 'f86c808504e3b292008252089491fd112728a18d37d27ca2631e19983fb3d1ca72880de0b6b3a76400008026a01115fd8f4a95e31c8ae613b7faaa7ec6be0d90af8c24224d41deb756766c5f0ea01f3d65607ef93230cf3aa091dd78ec310dcdddf81867e89ee2e49dce310455ae'
    }
  },
  {
    header: '6a4c744466547839', // OP_RETURN(6a) OP_PUSHDATA1(4c) (length 74) CDfTx.SIGNATURE(44665478) CEvmTx.OP_CODE(39)
    data: '6ef86c808504e3b292008252089431aff0f9bd809c09b17859c3167b0ed1965743e3880de0b6b3a76400008026a0a5c6a81fdacf02b1d6e78c132666faee8d9017e12c5a97983e5f998462e5a9c3a018bf23d147bcb6cd009a2c9fa76b28d707b61ed376679d907cecb7c38140bcd9',
    evmTx: {
      raw: 'f86c808504e3b292008252089431aff0f9bd809c09b17859c3167b0ed1965743e3880de0b6b3a76400008026a0a5c6a81fdacf02b1d6e78c132666faee8d9017e12c5a97983e5f998462e5a9c3a018bf23d147bcb6cd009a2c9fa76b28d707b61ed376679d907cecb7c38140bcd9'
    }
  }
]

describe.each(evmTxData)('should craft and compose dftx',
  ({ header, evmTx, data }: { header: string, data: string, evmTx: EvmTx }) => {
    it('should craft dftx with OP_CODES._() for evm tx', () => {
      const stack = [
        OP_CODES.OP_RETURN,
        OP_CODES.OP_DEFI_TX_EVM_TX(evmTx)
      ]

      const buffer = toBuffer(stack)
      expect(buffer.toString('hex')).toStrictEqual(header + data)
    })

    describe('Composable', () => {
      it('should compose from buffer to composable', () => {
        const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
        const composable = new CEvmTx(buffer)

        expect(composable.toObject()).toStrictEqual(evmTx)
      })

      it('should compose from composable to buffer', () => {
        const composable = new CEvmTx(evmTx)
        const buffer = new SmartBuffer()
        composable.toBuffer(buffer)

        expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
      })
    })
  })
