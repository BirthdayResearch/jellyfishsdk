import { SmartBuffer } from 'smart-buffer'
import BigNumber from 'bignumber.js'
import { CEvmTx, EvmTx, OP_DEFI_TX } from '../../../../src/script/dftx'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_CODES } from '../../../../src/script'

it.skip('should bi-directional buffer-object-buffer', () => {
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
    '6a4c7444665478396ef86c808504e3b292008252089491fd112728a18d37d27ca2631e19983fb3d1ca72880de0b6b3a76400008026a01115fd8f4a95e31c8ae613b7faaa7ec6be0d90af8c24224d41deb756766c5f0ea01f3d65607ef93230cf3aa091dd78ec310dcdddf81867e89ee2e49dce310455ae'
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
    header: '6a4c744466547839', // OP_RETURN(0x6a) (length 69 = 0x45) CDfTx.SIGNATURE(0x44665478) CTokenBurn.OP_CODE(0x46)
    data: '6ef86c808504e3b292008252089491fd112728a18d37d27ca2631e19983fb3d1ca72880de0b6b3a76400008026a01115fd8f4a95e31c8ae613b7faaa7ec6be0d90af8c24224d41deb756766c5f0ea01f3d65607ef93230cf3aa091dd78ec310dcdddf81867e89ee2e49dce310455ae',
    evmTx: {
      from: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('aad4dafbcf8c7f5f02ba5e67e101e0bf1ffdc855'),
          OP_CODES.OP_EQUAL
        ]
      },
      nonce: 0x0,
      gasPrice: 21,
      gasLimit: 21000,
      to: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('aad4dafbcf8c7f5f02ba5e67e101e0bf1ffdc855'),
          OP_CODES.OP_EQUAL
        ]
      },
      value: new BigNumber(1)
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
