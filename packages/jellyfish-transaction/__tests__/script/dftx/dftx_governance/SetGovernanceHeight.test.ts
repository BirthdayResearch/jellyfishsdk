import { SmartBuffer } from 'smart-buffer'
import {
  CSetGovernanceHeight, SetGovernanceHeight
} from '../../../../src/script/dftx/dftx_governance'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    // LP_SPLITS only
    '6a2c446654786a094c505f53504c4954530202000000809698000000000004000000804a5d050000000078563412',
    // LP_DAILY_DFI_REWARD only
    '6a25446654786a134c505f4441494c595f4446495f52455741524400204aa9d101000078563412',
    // LP_SPLITS and LP_DAILY_DFI_REWARD
    '6a48446654786a094c505f53504c495453020200000080c3c9010000000004000000801d2c0400000000134c505f4441494c595f4446495f524557415244c01c3d090000000078563412',
    '6a48446654786a094c505f53504c4954530202000000809698000000000004000000804a5d0500000000134c505f4441494c595f4446495f52455741524400204aa9d101000078563412'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x6a)
  })
})

describe('multiple variable', () => {
  /**
   * this test data is created by:
   * createToken() // id = 1
   * createPoolPair() // id = 2
   * createToken() // id = 3
   * createPoolPair() // id = 4
   * await container.call('setgov', [{
   *  LP_SPLITS: {
   *    2: 0.3,
   *    4: 0.7
   *  },
   *  LP_DAILY_DFI_REWARD: 1.55
   * }])
   */
  const header = '6a48446654786a' // OP_RETURN, PUSH_DATA(44665478, 6a)
  const data = '094c505f53504c495453020200000080c3c9010000000004000000801d2c0400000000134c505f4441494c595f4446495f524557415244c01c3d09000000006e000000'
  const setGovernanceHeight: SetGovernanceHeight = {
    governanceVars: [
      {
        key: 'LP_SPLITS',
        value: [
          {
            tokenId: 2,
            value: new BigNumber(0.3)
          },
          {
            tokenId: 4,
            value: new BigNumber(0.7)
          }
        ]
      },
      {
        key: 'LP_DAILY_DFI_REWARD',
        value: new BigNumber(1.55)
      }
    ],
    activationHeight: 110
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_SET_GOVERNANCE_HEIGHT(setGovernanceHeight)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CSetGovernanceHeight(buffer)

      expect(composable.toObject()).toStrictEqual(setGovernanceHeight)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CSetGovernanceHeight(setGovernanceHeight)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})

describe('single variable', () => {
  /**
   * this test data is created by:
   * createToken() // id = 1
   * createPoolPair() // id = 2
   * createToken() // id = 3
   * createPoolPair() // id = 4
   * await container.call('setgov', [{
   *  LP_SPLITS: {
   *    2: 0.3,
   *    4: 0.7
   *  }
   * }])
   */
  const header = '6a2c446654786a' // OP_RETURN, PUSH_DATA(44665478, 6a)
  const data = '094c505f53504c495453020200000080c3c9010000000004000000801d2c0400000000ea000000'
  const setGovernanceHeight: SetGovernanceHeight = {
    governanceVars: [
      {
        key: 'LP_SPLITS',
        value: [
          {
            tokenId: 2,
            value: new BigNumber(0.3)
          },
          {
            tokenId: 4,
            value: new BigNumber(0.7)
          }
        ]
      }
    ],
    activationHeight: 234
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_SET_GOVERNANCE_HEIGHT(setGovernanceHeight)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CSetGovernanceHeight(buffer)

      expect(composable.toObject()).toStrictEqual(setGovernanceHeight)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CSetGovernanceHeight(setGovernanceHeight)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})

describe('Unmapped Governance Variable handling', () => {
  const setGovernanceHeight: SetGovernanceHeight = {
    governanceVars: [
      {
        key: 'LP_DAILY_DFI_REWARD',
        value: new BigNumber(1.55)
      },
      {
        key: 'FOO',
        value: '0123456789abcdef'
      }
    ],
    activationHeight: 345
  }

  const lpRewards = '134c505f4441494c595f4446495f524557415244c01c3d0900000000'
  const fooBaz = '03464f4f0123456789abcdef' // [0x03 FOO {raw hex}]
  const height = '59010000'

  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(lpRewards + fooBaz + height, 'hex'))
    const composable = new CSetGovernanceHeight(buffer)

    expect(composable.toObject()).toStrictEqual(setGovernanceHeight)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CSetGovernanceHeight(setGovernanceHeight)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(lpRewards + fooBaz + height)
  })
})
