import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import { CTokenBalance, TokenBalanceUInt32 } from './dftx_balance'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'
import BigNumber from 'bignumber.js'

/**
 * TokenMint DeFi Transaction
 */
export interface TokenMint {
  balances: TokenBalanceUInt32[] // ----------| c = VarUInt{1-9 bytes}, + c x TokenBalance
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
      ComposableBuffer.compactSizeArray(() => tm.balances, v => tm.balances = v, v => new CTokenBalance(v))
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
      ComposableBuffer.compactSizeUtf8BE(() => tc.symbol, v => tc.symbol = v),
      ComposableBuffer.compactSizeUtf8BE(() => tc.name, v => tc.name = v),
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
      ComposableBuffer.compactSizeUtf8BE(() => tua.symbol, v => tua.symbol = v),
      ComposableBuffer.compactSizeUtf8BE(() => tua.name, v => tua.name = v),
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

/**
 * Known as "std::variant<CScript>" in cpp.
 */
interface VariantScript {
  variant: number
  context: Script
}

/**
 * Known as "std::variant<CScript>" in cpp.
 *
 * Composable TokenBurnVarInt, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
class CVariantScript extends ComposableBuffer<VariantScript> {
  composers (tb: VariantScript): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => tb.variant, v => tb.variant = v),
      ComposableBuffer.single<Script>(() => tb.context, v => tb.context = v, v => new CScript(v))
    ]
  }
}

/**
 * TokenBurn DeFi Transaction
 */
export interface TokenBurn {
  amounts: TokenBalanceUInt32[]
  from: Script
  burnType: number
  variantContext: VariantScript
}

/**
 * Composable TokenBurn, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenBurn extends ComposableBuffer<TokenBurn> {
  static OP_CODE = 0x46 // 'F'
  static OP_NAME = 'OP_DEFI_TX_TOKEN_BURN'

  composers (tb: TokenBurn): BufferComposer[] {
    return [
      ComposableBuffer.compactSizeArray(() => tb.amounts, v => tb.amounts = v, v => new CTokenBalance(v)),
      ComposableBuffer.single<Script>(() => tb.from, v => tb.from = v, v => new CScript(v)),
      ComposableBuffer.uInt8(() => tb.burnType, v => tb.burnType = v),
      ComposableBuffer.single<VariantScript>(() => tb.variantContext, v => tb.variantContext = v, v => new CVariantScript(v))
    ]
  }
}
