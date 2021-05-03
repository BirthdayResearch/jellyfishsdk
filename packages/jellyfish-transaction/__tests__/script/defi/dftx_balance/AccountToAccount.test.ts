import { SmartBuffer } from 'smart-buffer'
import { AccountToAccount, CAccountToAccount } from '../../../../src/script/defi/dftx_balance'
import { OP_CODES, toBuffer, toOPCodes } from '../../../../src/script'
import BigNumber from 'bignumber.js'
import { OP_DEFI_TX } from '../../../../src/script/defi'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [ // FIXME: change to DfTx62 data
    '6a4544665478421976a914078084bb24a623d99521a2d6a53de6c558811de888ac0117a9146db59cbbcb1c7eeb0550c21669966c18c47028ba8701000000003da5a50300000000',
    '6a43446654784217a914b76160c26b3e25fffe1a0fcf0107ace1cc586db0870117a914990b4f2d928f6dfb98c812b485c54dc73434ac248701070000007203000000000000',
    '6a4544665478421976a9147d9ec663ae7c31a7f26990529d63fda2b565c38e88ac0117a9140ae6eab32e282e09dd929519ad674d96cbb202e687010000000095382a2e00000000',
    '6a43446654784217a9146a75e3dbdee2de17134e891b3a408050fa44eac1870117a91463277879e3992a30a94671b4f61d1ca634d95442870103000000bd7c0d0000000000',
    '6a43446654784217a914b76160c26b3e25fffe1a0fcf0107ace1cc586db0870117a914990b4f2d928f6dfb98c812b485c54dc73434ac248701070000009319000000000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x42)
  })
})

/**
 * using accountToUtxos sample from
 * https://explorer.defichain.io/#/DFI/mainnet/tx/1788a0d8345808efaf03c0d1f5a7936fffb3b25b6c68218da4f9ec978dd6b4d4
 */
const header = '6a454466547842' // OP_RETURN 44665478 42
const data = '1976a914078084bb24a623d99521a2d6a53de6c558811de888ac0117a9146db59cbbcb1c7eeb0550c21669966c18c47028ba8701000000003da5a50300000000'
const accountToAccount: AccountToAccount = {
  from: {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('078084bb24a623d99521a2d6a53de6c558811de8'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  },
  to: [{
    balances: [
      {
        // 0.07431308 moved, total output = 0.61187389
        amount: new BigNumber('0.61187389'), token: 0
      }
    ],
    script: {
      stack: [
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA_HEX_LE('6db59cbbcb1c7eeb0550c21669966c18c47028ba'),
        OP_CODES.OP_EQUAL
      ]
    }
  }]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.DEFI_OP_ACCOUNT_TO_ACCOUNT(accountToAccount)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CAccountToAccount(buffer)
    expect(composable.toObject()).toEqual(accountToAccount)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CAccountToAccount(accountToAccount)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
