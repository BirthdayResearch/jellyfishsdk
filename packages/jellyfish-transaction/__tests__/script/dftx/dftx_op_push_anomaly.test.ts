import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { CTransactionSegWit, OP_CODES, TransactionSegWit } from '@defichain/jellyfish-transaction'

const hex = '0400000000010147b2bbfb8ca701aeefa60acbf7afe40228cc1b5ce0ecc8081950fa27da0bf9560100000017160014deb18f423234b0aa5f98bd7d08eec4dea342c6a3ffffffff020000000000000000a36a4c4f446654787317a91437243b861c6b234a65f52fe288e01188c1e1d5f28700010000000000000017a91437243b861c6b234a65f52fe288e01188c1e1d5f28702ffffffffffffff7fffffffffffffff7f4c4f446654787317a91437243b861c6b234a65f52fe288e01188c1e1d5f28700010000000000000017a91437243b861c6b234a65f52fe288e01188c1e1d5f28702ffffffffffffff7fffffffffffffff7f00ece51cb10000000017a91437243b861c6b234a65f52fe288e01188c1e1d5f2870002473044022056ffe0616d295805d243663698bbe4ec9c7910c64c35861ec9274a8d9e6772de02205f7c9579298eacbc34896a50a2cb580704be6e7a7dc27826eb3972ee84307dfe0121023162fbb3e335644da5ab266d6f2d29cee5f25a66e8dad852c3d7f73a56ed77f400000000'
const transaction: TransactionSegWit = {
  version: 4,
  marker: 0,
  flag: 1,
  vin: [
    {
      txid: '56f90bda27fa501908c8ece05c1bcc2802e4aff7cb0aa6efae01a78cfbbbb247',
      index: 1,
      script: {
        stack: [
          OP_CODES.OP_PUSHDATA_HEX_LE('0014deb18f423234b0aa5f98bd7d08eec4dea342c6a3')
        ]
      },
      sequence: 4294967295
    }
  ],
  vout: [
    {
      value: new BigNumber('0'),
      script: {
        stack: [
          OP_CODES.OP_RETURN,
          OP_CODES.OP_DEFI_TX_POOL_SWAP({
            fromTokenId: 0,
            toTokenId: 2,
            fromAmount: new BigNumber('0.00000001'),
            fromScript: {
              stack: [
                OP_CODES.OP_HASH160,
                OP_CODES.OP_PUSHDATA_HEX_LE('37243b861c6b234a65f52fe288e01188c1e1d5f2'),
                OP_CODES.OP_EQUAL
              ]
            },
            maxPrice: new BigNumber('9223372036854775807'),
            toScript: {
              stack: [
                OP_CODES.OP_HASH160,
                OP_CODES.OP_PUSHDATA_HEX_LE('37243b861c6b234a65f52fe288e01188c1e1d5f2'),
                OP_CODES.OP_EQUAL
              ]
            }
          }),
          OP_CODES.OP_PUSHDATA_HEX_LE('446654787317a91437243b861c6b234a65f52fe288e01188c1e1d5f28700010000000000000017a91437243b861c6b234a65f52fe288e01188c1e1d5f28702ffffffffffffff7fffffffffffffff7f')
        ]
      },
      tokenId: 0
    },
    {
      value: new BigNumber('29.714611'),
      script: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('37243b861c6b234a65f52fe288e01188c1e1d5f2'),
          OP_CODES.OP_EQUAL
        ]
      },
      tokenId: 0
    }
  ],
  witness: [
    {
      scripts: [
        { hex: '3044022056ffe0616d295805d243663698bbe4ec9c7910c64c35861ec9274a8d9e6772de02205f7c9579298eacbc34896a50a2cb580704be6e7a7dc27826eb3972ee84307dfe01' },
        { hex: '023162fbb3e335644da5ab266d6f2d29cee5f25a66e8dad852c3d7f73a56ed77f4' }
      ]
    }
  ],
  lockTime: 0
}

describe('CTransaction PoolSwap Anomaly', () => {
  it('should compose from double entry Transaction', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    const transaction = new CTransactionSegWit(buffer)

    expect(transaction.vout[0].script.stack.length).toStrictEqual(3)
    expect(transaction.vout[0].script.stack[0].type).toStrictEqual('OP_RETURN')
    expect(transaction.vout[0].script.stack[1].type).toStrictEqual('OP_DEFI_TX')
    expect(transaction.vout[0].script.stack[2].type).toStrictEqual('OP_PUSHDATA')
  })

  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    const composable = new CTransactionSegWit(buffer)

    expect(composable.toObject()).toStrictEqual(transaction)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CTransactionSegWit(transaction)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})
