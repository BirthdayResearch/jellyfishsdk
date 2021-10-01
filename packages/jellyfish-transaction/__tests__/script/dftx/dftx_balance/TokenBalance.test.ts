import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { CTokenBalance, CTokenBalanceVarInt, TokenBalance, TokenBalanceVarInt } from '../../../../src/script/dftx/dftx_balance'

{
  const data = '000000003da5a50300000000'
  const tokenBalance: TokenBalance = {
    token: 0,
    amount: new BigNumber('0.61187389')
  }

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CTokenBalance(buffer)
      expect(composable.toObject()).toStrictEqual(tokenBalance)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CTokenBalance(tokenBalance)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)
      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
}

{
  const data = '003da5a50300000000'
  const tokenBalance: TokenBalanceVarInt = {
    token: 0,
    amount: new BigNumber('0.61187389')
  }

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CTokenBalanceVarInt(buffer)
      expect(composable.toObject()).toStrictEqual(tokenBalance)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CTokenBalanceVarInt(tokenBalance)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)
      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
}
