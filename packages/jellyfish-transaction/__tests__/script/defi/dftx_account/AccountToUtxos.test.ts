import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { AccountToUtxos, CAccountToUtxos } from '../../../../src/script/defi/dftx_account'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a2b446654786217a914d6e3de1c51f22e580944bb6a1647f1d22f0159c78701000000007030e6550200000002',
    '6a2b446654786217a914fad0d4ab78412ec38e7a0b118e51e147e947e02d870100000000f2664e750200000002',
    '6a2b446654786217a91462f401bfbe944884f07b489eb97fd3b001d5303287010000000000a81dd50f00000002'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x62)
  })
})

/**
 * using accountToUtxos sample from
 * https://explorer.defichain.io/#/DFI/mainnet/tx/8acd31c4ba08a31adefa0af5816e52ac5d61ad184a397bcc114590ecf2b08ed6
 */
const header = '6a2b4466547862' // OP_RETURN 44665478 62
const data = '17a914d6e3de1c51f22e580944bb6a1647f1d22f0159c78701000000007030e6550200000002'
const accountToUtxos: AccountToUtxos = {
  from: {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('d6e3de1c51f22e580944bb6a1647f1d22f0159c7'),
      OP_CODES.OP_EQUAL
    ]
  },
  balances: [
    {
      amount: new BigNumber('100.31083632'), token: 0
    }
  ],
  mintingOutputsStart: 2
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_ACCOUNT_TO_UTXOS(accountToUtxos)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CAccountToUtxos(buffer)
    expect(composable.toObject()).toStrictEqual(accountToUtxos)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CAccountToUtxos(accountToUtxos)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
