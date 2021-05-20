import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/defi'
import { CPoolCreatePair, PoolCreatePair } from '../../../../src/script/defi/dftx_pool'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a2a4466547870000200e1f5050000000017a914462093ba56448f9b6d1d22584b3236e2555432d487010000',
    '6a2a44665478700004000000000000000017a914462093ba56448f9b6d1d22584b3236e2555432d487010000',
    '6a2a4466547870000100e1f5050000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d87010000',
    '6a2a4466547870000300e1f5050000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d87010000',
    '6a2a4466547870000580f0fa020000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d87010000',
    '6a2a4466547870000780f0fa020000000017a914809a32165e7eb9544f7415f3ad0cb817a1eeb0bb87010000',
    '6a2a4466547870000880f0fa020000000017a914809a32165e7eb9544f7415f3ad0cb817a1eeb0bb87000000',
    '6a2a4466547870000b00e1f5050000000017a914809a32165e7eb9544f7415f3ad0cb817a1eeb0bb87010000',
    '6a424466547870000d00e1f5050000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d870100020000000000e1f505000000000d00000000a3e11100000000',
    '6a484466547870000f00e1f5050000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d8701064446492d5356020000000000e1f505000000000d00000000a3e11100000000',

    '6a2a44665478700700400d03000000000017a914f78ca7530bd35fff6af98a49522a34f7508ab64e87010000', // https://mainnet.defichain.io/#/DFI/mainnet/tx/9e0c956f9c626c07ba3dd742748ff9872b5688a976d66d35aa09418f18620b64
    '6a2c44665478700900400d0300000000001976a9148f83f4f005ba70f0c5d7a59d4696daee13a6e43b88ac010000', // https://mainnet.defichain.io/#/DFI/mainnet/tx/75a25a52c54d12f84d4a553be354fa2c5651689d8f9f4860aad8b68c804af3f1
    '6a2c44665478700b00400d0300000000001976a9148f83f4f005ba70f0c5d7a59d4696daee13a6e43b88ac010000' // https://mainnet.defichain.io/#/DFI/mainnet/tx/84ef6a6733dd97d2d4b963ad99ab26829d58f4ab913dafb9cc7c84885f783854

    // ISSUE(canonbrother): `expected: 01000, received: 0100`
    // '6a2b44665478700200400d0300000000001976a9148f83f4f005ba70f0c5d7a59d4696daee13a6e43b88ac0100',  // https://mainnet.defichain.io/#/DFI/mainnet/tx/f3c99e199d0157b2b6254cf3a51bb1171569ad5c4beb797e957d245aec194d38
    // '6a2b44665478700100400d0300000000001976a9148f83f4f005ba70f0c5d7a59d4696daee13a6e43b88ac0100',  // https://mainnet.defichain.io/#/DFI/mainnet/tx/9827894c083b77938d13884f0404539daa054a818e0c5019afa1eeff0437a51b
    // '6a2b44665478700300400d0300000000001976a9148f83f4f005ba70f0c5d7a59d4696daee13a6e43b88ac0100',  // https://mainnet.defichain.io/#/DFI/mainnet/tx/37939243c7dbacb2675cfc4e0632e9bf829dcc5cece2928f235fba4b03c09a6a
  ]

  fixtures.forEach(hex => {
    const stack: any = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x70)
    expect(buffer.toString('hex')).toBe(hex)
  })
})

const header = '6a484466547870' // OP_RETURN, PUSH_DATA(44665478, 70)
const data = '000f00e1f5050000000017a91498f93e07509b6cb0d32557d1e0c2becc1a3e732d8701064446492d5356020000000000e1f505000000000d00000000a3e11100000000'
const poolCreatePair: PoolCreatePair = {
  tokenA: 0,
  tokenB: 15,
  status: true,
  commission: new BigNumber('1'),
  ownerAddress: {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('98f93e07509b6cb0d32557d1e0c2becc1a3e732d'),
      OP_CODES.OP_EQUAL
    ]
  },
  customRewards: [
    { token: 0, amount: new BigNumber('1') },
    { token: 13, amount: new BigNumber('3') }
  ],
  pairSymbol: 'DFI-SV'
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_POOL_CREATE_PAIR(poolCreatePair)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CPoolCreatePair(buffer)

    expect(composable.toObject()).toEqual(poolCreatePair)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CPoolCreatePair(poolCreatePair)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
