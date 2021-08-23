import { SmartBuffer } from 'smart-buffer'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { CICXSubmitEXTHTLC, ICXSubmitEXTHTLC } from '../../../../src/script/dftx/dftx_icxorderbook'
import { BigNumber } from '@defichain/jellyfish-json'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4c96446654783491470f554ca0816c2a11ed75a8e5939e915dbb62234ea51ac186ab2f8688e1db809698000000000020521a24e5418c971da262215bd30bd79f52611a63e038295b603f64fdc07f95223133734a51397742576838737369684855674161436d4e574a62424147354872394e21036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e625218000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toBe(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toBe(0x34)
  })
})

const header = '6a4c964466547834' // OP_RETURN(0x6a) OP_PUSHDATA1(0x4c) (length 150 = 0x96) CDfTx.SIGNATURE(0x44665478) CICXSubmitEXTHTLC.OP_CODE(0x34)
// ICXSubmitEXTHTLC.offerTx[LE](0x91470f554ca0816c2a11ed75a8e5939e915dbb62234ea51ac186ab2f8688e1db) ICXSubmitEXTHTLC.amount(0x8096980000000000)
// ICXSubmitEXTHTLC.hash[LE](0x20521a24e5418c971da262215bd30bd79f52611a63e038295b603f64fdc07f95) ICXSubmitEXTHTLC.htlcscriptAddress(0x223133734a51397742576838737369684855674161436d4e574a62424147354872394e)
// ICXSubmitEXTHTLC.ownerPubkey(0x21036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252) ICXSubmitEXTHTLC.timeout(0x18000000
const data = '91470f554ca0816c2a11ed75a8e5939e915dbb62234ea51ac186ab2f8688e1db809698000000000020521a24e5418c971da262215bd30bd79f52611a63e038295b603f64fdc07f95223133734a51397742576838737369684855674161436d4e574a62424147354872394e21036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e625218000000'

const submitEXTHTLC: ICXSubmitEXTHTLC = {
  offerTx: 'dbe188862fab86c11aa54e2362bb5d919e93e5a875ed112a6c81a04c550f4791',
  amount: new BigNumber(0.10),
  hash: '957fc0fd643f605b2938e0631a61529fd70bd35b2162a21d978c41e5241a5220',
  htlcScriptAddress: '13sJQ9wBWh8ssihHUgAaCmNWJbBAG5Hr9N',
  ownerPubkey: '036494e7c9467c8c7ff3bf29e841907fb0fa24241866569944ea422479ec0e6252',
  timeout: 24
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_ICX_SUBMIT_EXT_HTLC(submitEXTHTLC)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toBe(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CICXSubmitEXTHTLC(buffer)

    expect(composable.toObject()).toEqual(submitEXTHTLC)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CICXSubmitEXTHTLC(submitEXTHTLC)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toEqual(data)
  })
})
