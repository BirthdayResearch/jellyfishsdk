import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { CScriptBalances, ScriptBalances } from '../../../../src/script/defi/dftx_balance'
import { OP_CODES } from '../../../../src/script'

const data = '17a914d6e3de1c51f22e580944bb6a1647f1d22f0159c78701000000007030e65502000000'
const scriptBalances: ScriptBalances = {
  script: {
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
  ]
}

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CScriptBalances(buffer)
    expect(composable.toObject()).toEqual(scriptBalances)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CScriptBalances(scriptBalances)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)
    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
