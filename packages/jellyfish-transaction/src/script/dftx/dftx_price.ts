import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'

export interface CurrencyPair {
  token: string // --------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
  currency: string // -----------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
}

/**
 * Composable CurrencyPair, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CCurrencyPair extends ComposableBuffer<CurrencyPair> {
  composers (cp: CurrencyPair): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => cp.token, v => cp.token = v),
      ComposableBuffer.varUIntUtf8BE(() => cp.currency, v => cp.currency = v)
    ]
  }
}

export interface TokenAmount {
  currency: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
  amount: BigNumber // -----------------| 8 bytes
}

/**
 * Composable TokenAmount, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenAmount extends ComposableBuffer<TokenAmount> {
  composers (tp: TokenAmount): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => tp.currency, v => tp.currency = v),
      ComposableBuffer.satoshiAsBigNumber(() => tp.amount, v => tp.amount = v)
    ]
  }
}

export interface TokenPrice {
  token: string // ---------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
  prices: TokenAmount[] // -------------| c = VarUInt{1-9 bytes}, + c txn_builder_update_loan_token1.test.ts TokenAmount
}

/**
 * Composable TokenPrice, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenPrice extends ComposableBuffer<TokenPrice> {
  composers (sb: TokenPrice): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => sb.token, v => sb.token = v),
      ComposableBuffer.varUIntArray(() => sb.prices, v => sb.prices = v, v => new CTokenAmount(v))
    ]
  }
}
