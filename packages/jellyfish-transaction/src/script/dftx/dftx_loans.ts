import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import BigNumber from 'bignumber.js'

/**
 * CreateLoanScheme DeFi Transaction
 */
export interface CreateLoanScheme {
  ratio: number // -----------------------| 4 bytes unsigned
  rate: BigNumber // ---------------------| 8 bytes unsigned
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
  update: BigNumber // -------------------| 8 bytes unsigned integer, activation block height. 0 for createLoanScheme, > 0 for updateLoanScheme
}

/**
 * Composable CreateLoanScheme, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CCreateLoanScheme extends ComposableBuffer<CreateLoanScheme> {
  static OP_CODE = 0x4c // 'L'
  static OP_NAME = 'OP_DEFI_TX_CREATE_LOAN_SCHEME'

  composers (cls: CreateLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => cls.ratio, v => cls.ratio = v),
      ComposableBuffer.satoshiAsBigNumber(() => cls.rate, v => cls.rate = v),
      ComposableBuffer.varUIntUtf8BE(() => cls.identifier, v => cls.identifier = v),
      ComposableBuffer.bigNumberUInt64(() => cls.update, v => cls.update = v)
    ]
  }
}

/**
 * SetDefaultLoanScheme DeFi Transaction
 */
export interface SetDefaultLoanScheme {
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
}

/**
 * Composable SetDefaultLoanScheme, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CSetDefaultLoanScheme extends ComposableBuffer<SetDefaultLoanScheme> {
  static OP_CODE = 0x64 // 'd'
  static OP_NAME = 'OP_DEFI_TX_SET_DEFAULT_LOAN_SCHEME'

  composers (sdls: SetDefaultLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => sdls.identifier, v => sdls.identifier = v)
    ]
  }
}

/**
 * SetLoanToken DeFi Transaction
 */
export interface SetLoanToken {
  symbol: string // ------------| VarUInt{1-9 bytes} Symbol or id of collateral token
  name: string // --------------| VarUInt{1-9 bytes} Token's name, no longer than 128 characters
  priceFeedId: string // -------| 32 bytes, hex string Txid of oracle feeding the price
  mintable: boolean // ---------| 4 bytes, mintable, Token's 'Mintable' property
  interest: BigNumber // -------| 8 bytes unsigned, interest rate
}

/**
 * Composable SetLoanToken, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CSetLoanToken extends ComposableBuffer<SetLoanToken> {
  static OP_CODE = 0x67 // 'g'
  static OP_NAME = 'OP_DEFI_TX_SET_LOAN_TOKEN'

  composers (slt: SetLoanToken): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => slt.symbol, v => slt.symbol = v),
      ComposableBuffer.varUIntUtf8BE(() => slt.name, v => slt.name = v),
      ComposableBuffer.hexBEBufferLE(32, () => slt.priceFeedId, v => slt.priceFeedId = v),
      ComposableBuffer.uBool8(() => slt.mintable, v => slt.mintable = v),
      ComposableBuffer.satoshiAsBigNumber(() => slt.interest, v => slt.interest = v)
    ]
  }
}
