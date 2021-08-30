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
 * SetDefaultLoanScheme DeFi Transaction
 */
export interface SetDefaultLoanScheme {
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
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
 * UpdateLoanToken DeFi Transaction
 */
export interface UpdateLoanToken {
  tokenTx: string // ------------| 32 bytes, hex string Txid of tokens's creation tx
  symbol: string // ------------| VarUInt{1-9 bytes}, Symbol or id of collateral token
  name: string // ------------| VarUInt{1-9 bytes}, Token's name, no longer than 128 characters
  priceFeedId: string // ------------| 32 bytes, hex string Txid of oracle feeding the price
  mintable: boolean // ------------| 4 bytes, mintable, Token's 'Mintable' property
  interest: BigNumber // ------------| 8 bytes unsigned, interest rate
}

export class CUpdateLoanToken extends ComposableBuffer<UpdateLoanToken> {
  static OP_CODE = 0x66
  static OP_NAME = 'OP_DEFI_TX_UPDATE_LOAN_TOKEN'

  composers (ult: UpdateLoanToken): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => ult.symbol, v => ult.symbol = v),
      ComposableBuffer.varUIntUtf8BE(() => ult.name, v => ult.name = v),
      ComposableBuffer.hexBEBufferLE(32, () => ult.priceFeedId, v => ult.priceFeedId = v),
      ComposableBuffer.uBool8(() => ult.mintable, v => ult.mintable = v),
      ComposableBuffer.satoshiAsBigNumber(() => ult.interest, v => ult.interest = v),
      ComposableBuffer.hexBEBufferLE(32, () => ult.tokenTx, v => ult.tokenTx = v)
    ]
  }
}
