// import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
// import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
// import { AccountToUtxos, CAccountToUtxos } from '../../../../src/script/dftx/dftx_account'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    '6a4c514466547838000117a9145e93a29ac15cc3cacb3e9b192fa0bfc4acaab45187010000000040420f000000000001166014504be416ead5222b5b9fafac97e215809647fcd8010000000040420f0000000000',
    '6a4c514466547838010117a9145e93a29ac15cc3cacb3e9b192fa0bfc4acaab45187010000000040420f000000000001166014504be416ead5222b5b9fafac97e215809647fcd8010000000040420f0000000000',
    '6a4c514466547838010117a9145e93a29ac15cc3cacb3e9b192fa0bfc4acaab45187010000000000e1f50500000000011660146aa59c49b27d9a3cbd9f976f7e6179f84be53c05010000000000e1f50500000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x38)
  })
})

// /**
//  * using accountToUtxos sample from
//  * https://explorer.defichain.io/#/DFI/mainnet/tx/8acd31c4ba08a31adefa0af5816e52ac5d61ad184a397bcc114590ecf2b08ed6
//  */
// const header = '6a2b4466547862' // OP_RETURN 44665478 62
// const data = '17a914d6e3de1c51f22e580944bb6a1647f1d22f0159c78701000000007030e6550200000002'
// const accountToUtxos: AccountToUtxos = {
//   from: {
//     stack: [
//       OP_CODES.OP_HASH160,
//       OP_CODES.OP_PUSHDATA_HEX_LE('d6e3de1c51f22e580944bb6a1647f1d22f0159c7'),
//       OP_CODES.OP_EQUAL
//     ]
//   },
//   balances: [
//     {
//       amount: new BigNumber('100.31083632'), token: 0
//     }
//   ],
//   mintingOutputsStart: 2
// }

// it('should craft dftx with OP_CODES._()', () => {
//   const stack = [
//     OP_CODES.OP_RETURN,
//     OP_CODES.OP_DEFI_TX_ACCOUNT_TO_UTXOS(accountToUtxos)
//   ]

//   const buffer = toBuffer(stack)
//   expect(buffer.toString('hex')).toStrictEqual(header + data)
// })

// describe('Composable', () => {
//   it('should compose from buffer to composable', () => {
//     const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
//     const composable = new CAccountToUtxos(buffer)
//     expect(composable.toObject()).toStrictEqual(accountToUtxos)
//   })

//   it('should compose from composable to buffer', () => {
//     const composable = new CAccountToUtxos(accountToUtxos)
//     const buffer = new SmartBuffer()
//     composable.toBuffer(buffer)

//     expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
//   })
// })
