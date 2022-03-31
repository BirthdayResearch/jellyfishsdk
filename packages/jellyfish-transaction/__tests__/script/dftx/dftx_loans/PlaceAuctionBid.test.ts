import { SmartBuffer } from 'smart-buffer'
import {
  CPlaceAuctionBid,
  PlaceAuctionBid
} from '../../../../src/script/dftx/dftx_loans'
import { OP_CODES } from '../../../../src/script'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import BigNumber from 'bignumber.js'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    /**
      * PlaceAuctionBid : {
        vaultId: '89443201375514b9082916d6cfa019384860fb21c03e0f028630a726da237185',
        index: 0,
        from: 'bcrt1q3xw4dgexgeke7gxxfrd4qyvg5dfggfdazjurf3',
        amount: '525@TSLA'
      }
     */
    '6a494466547849857123da26a73086020f3ec021fb60483819a0cfd6162908b91455370132448900000000160014899d56a326466d9f20c648db501188a3528425bd02006d3e390c000000',
    /**
      * PlaceAuctionBid : {
        vaultId: '070e603e6edd240a2b08bb0c068c2f958931b78808513c1111ebafd3ea5ddc7b',
        index: 1,
        from: 'bcrt1qjhquzpywxkm8wqe58990sv96l3t7q36shyy4w2',
        amount: '530@UBER'
      }
     */
    '6a4944665478497bdc5dead3afeb11113c510888b73189952f8c060cbb082b0a24dd6e3e600e070100000016001495c1c1048e35b6770334394af830bafc57e047500200d20b570c000000',
    /**
      * PlaceAuctionBid : {
        vaultId: '8b6120dd0fd6ef7219bf7c40f34567910e13df3b64a6b224adc4ec3be9060dba',
        index: 0,
        from: 'bcrt1qsq9hyh0et52u67ae25fjt992x0xma0qz68gxha',
        amount: '535@APPL'
      }
     */
    '6a494466547849ba0d06e93becc4ad24b2a6643bdf130e916745f3407cbf1972efd60fdd20618b00000000160014800b725df95d15cd7bb955132594aa33cdbebc02020037d9740c000000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x49)
  })
})

const header = '6a494466547849' // OP_RETURN(0x6a) (length 73 = 0x49) CDfTx.SIGNATURE(0x44665478) CPlaceAuctionBid.OP_CODE(0x49)
// PlaceAuctionBid.vaultId[LE](0xba0d06e93becc4ad24b2a6643bdf130e916745f3407cbf1972efd60fdd20618b)
// PlaceAuctionBid.index[LE](0x00000000)
// PlaceAuctionBid.from(0x800b725df95d15cd7bb955132594aa33cdbebc02)
// PlaceAuctionBid.amount(0x020037d9740c000000)
const data = 'ba0d06e93becc4ad24b2a6643bdf130e916745f3407cbf1972efd60fdd20618b00000000160014800b725df95d15cd7bb955132594aa33cdbebc02020037d9740c000000'
const placeAuctionBid: PlaceAuctionBid = {
  vaultId: '8b6120dd0fd6ef7219bf7c40f34567910e13df3b64a6b224adc4ec3be9060dba',
  index: 0,
  from: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('800b725df95d15cd7bb955132594aa33cdbebc02')
    ]
  },
  tokenAmount: { token: 2, amount: new BigNumber(535) }
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_AUCTION_BID(placeAuctionBid)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CPlaceAuctionBid(buffer)

    expect(composable.toObject()).toStrictEqual(placeAuctionBid)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CPlaceAuctionBid(placeAuctionBid)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
