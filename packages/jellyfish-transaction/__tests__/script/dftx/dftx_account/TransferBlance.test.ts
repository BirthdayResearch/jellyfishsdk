// import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
// import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
// import { TransferBalance, CTransferBalance } from '../../../../src/script/dftx/dftx_account'
// import BigNumber from 'bignumber.js'

it.skip('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    // '6a224466547838010117a9140c75b562831107a91b3268bb2f45b667920420a587010000'
    '6a4c514466547838010117a9140c75b562831107a91b3268bb2f45b667920420a58701000000000065cd1d00000000011660149702f4bca85647620729b87e5960b20f515e93d501000000000065cd1d00000000'
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
//  * using transferBalance sample from
//  * https://explorer.defichain.io/#/DFI/mainnet/tx/8acd31c4ba08a31adefa0af5816e52ac5d61ad184a397bcc114590ecf2b08ed6
//  */
// const header = '6a2e4466547838' // OP_RETURN 44665478 38
// const data = '000117a9145e93a29ac15cc3cacb3e9b192fa0bfc4acaab45187010000000040420f00000000000100'
// const transferBalance: TransferBalance = {
//   from: {
//     balances: [
//       {
//         amount: new BigNumber('1'), token: 0
//       }
//     ],
//     stack: [
//       OP_CODES.OP_HASH160,
//       OP_CODES.OP_PUSHDATA_HEX_LE('d6e3de1c51f22e580944bb6a1647f1d22f0159c7'),
//       OP_CODES.OP_EQUAL
//     ]
//   },
//   type: 1,
//   to: [{
//     balances: [
//       {
//         amount: new BigNumber('1'), token: 0
//       }
//     ],
//     script: {
//       stack: [
//         OP_CODES.OP_HASH160,
//         OP_CODES.OP_PUSHDATA_HEX_LE('6db59cbbcb1c7eeb0550c21669966c18c47028ba'),
//         OP_CODES.OP_EQUAL
//       ]
//     }
//   }]
// }

// it('should craft dftx with OP_CODES._()', () => {
//   const stack = [
//     OP_CODES.OP_RETURN,
//     OP_CODES.OP_DEFI_TX_TRANSFER_BALANCE(transferBalance)
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
