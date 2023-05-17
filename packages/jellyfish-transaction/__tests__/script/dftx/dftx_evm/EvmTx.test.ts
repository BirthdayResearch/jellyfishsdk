import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     {
        // TODO (lyka): EVM TX DETAILS
        6a: OP_CODE
        4c74: ...
        44665478396ef86c808504e3b2: ...
     }
     */
    /**
     * Vout Hex Data:
        {
            from: ethAddress,
            to: toEthAddress,
            nonce: 0,
            gasPrice: 21,
            gasLimit: 21000,
            value: new BigNumber(1),
        }
     */
    '6a4c7444665478396ef86c808504e3b29200825208943e6f6b726024eb049cec041d4aeca14fc19fb9c5880de0b6b3a76400008025a062b19f00a1700e213240a6ea8c36ce0609ef2bc1cbce2ab854d3e68aa5d6de48a075b698851bc14d49fe81f546e408f7536dff9a222514c48876f9f2e7e5457463'
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
