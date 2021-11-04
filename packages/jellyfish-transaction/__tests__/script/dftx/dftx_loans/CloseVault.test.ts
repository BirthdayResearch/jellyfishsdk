import { SmartBuffer } from 'smart-buffer'
import {
  CCloseVault,
  CloseVault
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * loan : {
     *   vaultId: '186a156dca213f004fce018ef2244c35414b25b32c34260f1cd6bc8062de9054',
     *   to: 'bcrt1qv0efjedr2y67eh6wczelu4385utxu0u7jh66zz'
     * }
     */
    '6a3c44665478655490de6280bcd61c0f26342cb3254b41354c24f28e01ce4f003f21ca6d156a1816001463f29965a35135ecdf4ec0b3fe5627a7166e3f9e',
    /**
     * loan : {
     *   vaultId: '3c1bedc582d73eed8d13b224bb30a99ec805f7393264d78f36051a852be3849f',
     *   to: 'bcrt1qlcdnraxm09plwenhlsc4axd6mn0pzma882j8qs'
     * }
     */
    '6a3c44665478659f84e32b851a05368fd7643239f705c89ea930bb24b2138ded3ed782c5ed1b3c160014fe1b31f4db7943f76677fc315e99badcde116fa7',
    /**
     * loan : {
     *   vaultId: '80fb74936357c474fd64541f9bafdf9e11dcbe568bf1536295a267a75c884d5d',
     *   to: 'bcrt1qd8j34pqmea84gsxjzkhc06nq2a83v2n6t466jt'
     * }
     */
    '6a3c44665478655d4d885ca767a2956253f18b56bedc119edfaf9b1f5464fd74c457639374fb8016001469e51a841bcf4f5440d215af87ea60574f162a7a'
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

const header = '6a3c4466547865' // OP_RETURN(0x6a) (length 60 = 0x3c) CDfTx.SIGNATURE(0x44665478) CCloseVault.OP_CODE(0x65)
// CloseVault.vaultId[LE](0x5490de6280bcd61c0f26342cb3254b41354c24f28e01ce4f003f21ca6d156a18)
// CloseVault.to(0x16001463f29965a35135ecdf4ec0b3fe5627a7166e3f9e)
const data = '5490de6280bcd61c0f26342cb3254b41354c24f28e01ce4f003f21ca6d156a1816001463f29965a35135ecdf4ec0b3fe5627a7166e3f9e'
const closeVault: CloseVault = {
  vaultId: '186a156dca213f004fce018ef2244c35414b25b32c34260f1cd6bc8062de9054',
  to: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('63f29965a35135ecdf4ec0b3fe5627a7166e3f9e')
    ]
  }
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_CLOSE_VAULT(closeVault)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CCloseVault(buffer)

    expect(composable.toObject()).toStrictEqual(closeVault)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CCloseVault(closeVault)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
