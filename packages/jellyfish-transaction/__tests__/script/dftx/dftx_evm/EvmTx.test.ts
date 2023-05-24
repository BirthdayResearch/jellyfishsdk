import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'

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
    '6a4c7444665478396ef86c808504e3b29200825208946c34cbb9219d8caa428835d2073e8ec88ba0a110880de0b6b3a76400008025a037f41c543402c9b02b35b45ef43ac31a63dcbeba0c622249810ecdec00aee376a05eb2be77eb0c7a1875a53ba15fc6afe246fbffe869157edbde64270e41ba045e0000000000'
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

// TODO: Add tests to craft and compose dftx
