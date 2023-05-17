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
            data: '0x00'
        }
     */
    '6a4c7444665478396ef86c808504e3b292008252089489ba22c8c48e6ecc1bca0ae974015db907696180880de0b6b3a76400008026a0cc528f844e6dd7221af34d7e9d0b46f35fd6c2ec73bfcdf164ada84045eee6b9a03d8d4950f2b38950858070aa87549e7e17b21c007b28aba1fb21db7fdd735ec3'
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
