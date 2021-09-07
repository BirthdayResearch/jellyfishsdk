import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import { CTokenBalance, TokenBalance } from './dftx_balance'
import BigNumber from 'bignumber.js'

/**
 * TokenMint DeFi Transaction
 */
export interface TokenMint {
  balances: TokenBalance[] // ----------| c = VarUInt{1-9 bytes}, + c x TokenBalance
}

/**
 * Composable TokenMint, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenMint extends ComposableBuffer<TokenMint> {
  static OP_CODE = 0x4d // 'M'
  static OP_NAME = 'OP_DEFI_TX_TOKEN_MINT'

  composers (tm: TokenMint): BufferComposer[] {
    return [
      ComposableBuffer.varUIntArray(() => tm.balances, v => tm.balances = v, v => new CTokenBalance(v))
    ]
  }
}

/**
 * TokenCreate DeFi Transaction
 */
export interface TokenCreate {
  symbol: string // ---------------------| VarUInt{1-9 bytes}, + n bytes
  name: string // -----------------------| VarUInt{1-9 bytes}, + n bytes
  decimal: number // --------------------| 1 byte
  limit: BigNumber // -------------------| 8 bytes
  isDAT: boolean // ---------------------| 1 byte bitmask start, position 0
  tradeable: boolean // -----------------| 1 byte bitmask, position 1
  mintable: boolean // ------------------| 1 byte bitmask end, position 2
}

/**
 * Composable TokenCreate, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenCreate extends ComposableBuffer<TokenCreate> {
  static OP_CODE = 0x54 /// 'T'
  static OP_NAME = 'OP_DEFI_TX_TOKEN_CREATE'

  composers (tc: TokenCreate): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => tc.symbol, v => tc.symbol = v),
      ComposableBuffer.varUIntUtf8BE(() => tc.name, v => tc.name = v),
      ComposableBuffer.uInt8(() => tc.decimal, v => tc.decimal = v),
      ComposableBuffer.bigNumberUInt64(() => tc.limit, v => tc.limit = v),
      ComposableBuffer.bitmask1Byte(3, () => [tc.isDAT, tc.tradeable, tc.mintable], v => {
        tc.isDAT = v[0]
        tc.tradeable = v[1]
        tc.mintable = v[2]
      })
    ]
  }
}

/**
 * TokenUpdate DeFi Transaction
 * Note(canonbrother): Only 'isDAT' flag modification allowed before Bayfront fork (<10000)
 */
export interface TokenUpdate {
  creationTx: string // -----------------| 32 bytes hex string
  isDAT: boolean // ---------------------| 1 byte bitmask start, position 0
}

/**
 * Composable CTokenUpdate, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenUpdate extends ComposableBuffer<TokenUpdate> {
  static OP_CODE = 0x4e /// 'N'
  static OP_NAME = 'OP_DEFI_TX_TOKEN_UPDATE'

  composers (tu: TokenUpdate): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => tu.creationTx, v => tu.creationTx = v),
      ComposableBuffer.bitmask1Byte(1, () => [tu.isDAT], v => {
        tu.isDAT = v[0]
      })
    ]
  }
}

/**
 * TokenUpdateAny DeFi Transaction
 */
export interface TokenUpdateAny extends TokenCreate {
  creationTx: string // -----------------| 32 bytes hex string
}

/**
 * Composable TokenUpdateAny, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenUpdateAny extends ComposableBuffer<TokenUpdateAny> {
  static OP_CODE = 0x6e /// 'n'
  static OP_NAME = 'OP_DEFI_TX_TOKEN_UPDATE_ANY'

  composers (tua: TokenUpdateAny): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => tua.creationTx, v => tua.creationTx = v),
      ComposableBuffer.varUIntUtf8BE(() => tua.symbol, v => tua.symbol = v),
      ComposableBuffer.varUIntUtf8BE(() => tua.name, v => tua.name = v),
      ComposableBuffer.uInt8(() => tua.decimal, v => tua.decimal = v),
      ComposableBuffer.bigNumberUInt64(() => tua.limit, v => tua.limit = v),
      ComposableBuffer.bitmask1Byte(3, () => [tua.isDAT, tua.tradeable, tua.mintable], v => {
        tua.isDAT = v[0]
        tua.tradeable = v[1]
        tua.mintable = v[2]
      })
    ]
  }
}
