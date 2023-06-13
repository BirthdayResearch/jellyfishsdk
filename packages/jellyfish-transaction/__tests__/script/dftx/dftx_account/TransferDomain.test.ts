import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { TransferDomain, CTransferDomain } from '../../../../src/script/dftx/dftx_account'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
     * [{
     *  [TransferDomainKey.SRC]: {
     *    address: '2N1nTGPQ6Q6k2zVX9tBGnaE4jsP9pzMej1P',
     *    amount '3@DFI',
     *    domain: TransferDomainType.DVM
     *  },
     *  [TransferDomainKey.DST]: {
     *    address: '0x86773C61086A9b6b24CE541eB5637e61F446B880',
     *    amount: '1.23456789@DFI',
     *    domain: TransferDomainType.EVM
     *  }
     * }]
     */
    '6a4b44665478380117a9145da8fc155086aba13fc48b4eabf2d38ab39a4fbc870000a3e11100000000020016601486773c61086a9b6b24ce541eb5637e61f446b8800000a3e111000000000300',
    /**
     * [{
     *  [TransferDomainKey.SRC]: {
     *    address: '2MzG52a4deQYjN6GxQMZVXhHrw5e4y67HLj',
     *    amount '3@DFI',
     *    domain: TransferDomainType.DVM
     *  },
     *  [TransferDomainKey.DST]: {
     *    address: '0xffD258C46c9680D5E8a841A4049D8Ef2Ac4F9Df3',
     *    amount: '1.23456789@DFI',
     *    domain: TransferDomainType.EVM
     *  }
     * }]
     */
    '6a4b44665478380117a9144cf1d108cebd26cba2deedc6e5e7b803f1cc4421870015cd5b07000000000200166014ffd258c46c9680d5e8a841a4049d8ef2ac4f9df30015cd5b07000000000300',
    /**
     * [{
     *  [TransferDomainKey.SRC]: {
     *    address: '2N5ENYosHTfoqrDxhyPXsF1U7f9pJbwEpRP',
     *    amount '0.00000004@DFI',
     *    domain: TransferDomainType.DVM
     *  },
     *  [TransferDomainKey.DST]: {
     *    address: '0xba5D5C77F5f56a949a57ceF0D8A5fC9b22E5B6D0',
     *    amount: '0.00000004@DFI',
     *    domain: TransferDomainType.EVM
     *  }
     * }]
     */
    '6a4b44665478380117a91483783d579d385369c81df230ec6d4b316cd0eebe870004000000000000000200166014ba5d5c77f5f56a949a57cef0d8a5fc9b22e5b6d00004000000000000000300',
    /**
     * [{
     *  [TransferDomainKey.SRC]: {
     *    address: '0x8abE1FaDb210B634bd7EB4bBEDD63ae4D3DF280a',
     *    amount '3@DFI',
     *    domain: TransferDomainType.EVM
     *  },
     *  [TransferDomainKey.DST]: {
     *    address: '2MuGAF5bpgnoFo2TjJCbPmzyRXeu3uoaf5r',
     *    amount: '3@DFI',
     *    domain: TransferDomainType.DVM
     *  }
     * }]
     */
    '6a4b4466547838011660148abe1fadb210b634bd7eb4bbedd63ae4d3df280a0000a3e11100000000030017a914161d8a9c734111864a34e44ba7c412af8e1b892f870000a3e111000000000200'
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

const header = '6a4b4466547838' // OP_RETURN(0x6a) (length 76 = 0x4b) CDfTx.SIGNATURE(0x44665478) CTransferDomain.OP_CODE(0x38)
// TransferDomain[0].OP_H160 (0xa9)
// TransferDomain[0].OP_PUSHDATA_HEX_LE (0x5da8fc155086aba13fc48b4eabf2d38ab39a4fbc)
// TransferDomain[0].OP_EQUAL (0x87)
// TransferDomain[0].amount.token (0x00)
// TransferDomain[0].amount.amount [LE] (0x00a3e11100000000) -> 0x0000000011e1a300 -> 300000000
// TransferDomain[0].domain (0x02)
// TransferDomain[0].data (0x00)
// TransferDomain[1].OP_CODES.OP_16 (0x60)
// length 20 = 0x14
// TransferDomain[1].OP_PUSHDATA_HEX_LE (0x86773c61086a9b6b24ce541eb5637e61f446b880)
// TransferDomain[0].amount.token (0x00)
// TransferDomain[0].amount.amount [LE] (0x00a3e11100000000) -> 0x0000000011e1a300 -> 300000000
// TransferDomain[0].domain (0x03)
// TransferDomain[0].data (0x00)
const data = '0117a9145da8fc155086aba13fc48b4eabf2d38ab39a4fbc870000a3e11100000000020016601486773c61086a9b6b24ce541eb5637e61f446b8800000a3e111000000000300'
const transferDomain: TransferDomain = {
  items: [{
    src: {
      address: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('5da8fc155086aba13fc48b4eabf2d38ab39a4fbc'),
          OP_CODES.OP_EQUAL
        ]
      },
      amount: { token: 0, amount: new BigNumber(3) },
      domain: 2, // TransferDomainType.DVM
      data: 0
    },
    dst: {
      address: {
        stack: [
          OP_CODES.OP_16,
          OP_CODES.OP_PUSHDATA_HEX_LE('86773c61086a9b6b24ce541eb5637e61f446b880')
        ]
      },
      amount: { token: 0, amount: new BigNumber(3) },
      domain: 3, // TransferDomainType.EVM
      data: 0
    }
  }]
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_TRANSFER_DOMAIN(transferDomain)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CTransferDomain(buffer)

    expect(composable.toObject()).toStrictEqual(transferDomain)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CTransferDomain(transferDomain)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
