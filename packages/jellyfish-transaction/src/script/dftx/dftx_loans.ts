import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import { CTokenBalance, TokenBalanceUInt32 } from './dftx_balance'
import BigNumber from 'bignumber.js'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'
import { CCurrencyPair, CurrencyPair } from './dftx_price'

/**
 * CreateLoanScheme / UpdateLoanScheme DeFi Transaction
 */
export interface SetLoanScheme {
  ratio: number // -----------------------| 4 bytes unsigned, Minimum collateralization ratio
  rate: BigNumber // ---------------------| 8 bytes unsigned, Interest rate
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string, Unique identifier of the loan scheme
  update: BigNumber // -------------------| 8 bytes unsigned integer, Activation block height. 0 for createLoanScheme, > 0 for updateLoanScheme
}

/**
 * Composable CreateLoanScheme and UpdateLoanScheme, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CSetLoanScheme extends ComposableBuffer<SetLoanScheme> {
  static OP_CODE = 0x4c // 'L'
  static OP_NAME = 'OP_DEFI_TX_SET_LOAN_SCHEME'

  composers (sls: SetLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => sls.ratio, v => sls.ratio = v),
      ComposableBuffer.satoshiAsBigNumber(() => sls.rate, v => sls.rate = v),
      ComposableBuffer.compactSizeUtf8BE(() => sls.identifier, v => sls.identifier = v),
      ComposableBuffer.bigNumberUInt64(() => sls.update, v => sls.update = v)
    ]
  }
}

/**
 * DestroyLoanScheme DeFi Transaction
 */
export interface DestroyLoanScheme {
  identifier: string // ------------------| c = VarUInt{1-9 bytes} + c bytes UTF encoded string, Unique identifier of the loan scheme
  height: BigNumber // -------------------| 8 bytes unsigned integer, Activation block height
}

/**
 * Composable DestroyLoanScheme, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CDestroyLoanScheme extends ComposableBuffer<DestroyLoanScheme> {
  static OP_CODE = 0x44 // 'D'
  static OP_NAME = 'OP_DEFI_TX_DESTROY_LOAN_SCHEME'

  composers (dls: DestroyLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.compactSizeUtf8BE(() => dls.identifier, v => dls.identifier = v),
      ComposableBuffer.bigNumberUInt64(() => dls.height, v => dls.height = v)
    ]
  }
}

/**
 * SetDefaultLoanScheme DeFi Transaction
 */
export interface SetDefaultLoanScheme {
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string, Unique identifier of the loan scheme
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
      ComposableBuffer.compactSizeUtf8BE(() => sdls.identifier, v => sdls.identifier = v)
    ]
  }
}

/**
 * SetCollateralToken DeFi Transaction
 */
export interface SetCollateralToken {
  token: number // ----------------| VarInt{MSB-b128}
  factor: BigNumber // ------------| 8 bytes unsigned, Collateralization factor
  currencyPair: CurrencyPair // ---| c1 = VarUInt{1-9 bytes} + c1 bytes UTF encoded string for token + c2 = VarUInt{1-9 bytes} + c2 bytes UTF encoded string for currency, token/currency pair to use for price of token
  activateAfterBlock: number // ---| 4 bytes unsigned, Changes will be active after the block height
}

/**
 * Composable SetCollateralToken, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CSetCollateralToken extends ComposableBuffer<SetCollateralToken> {
  static OP_CODE = 0x63 // 'c'
  static OP_NAME = 'OP_DEFI_TX_SET_COLLATERAL_TOKEN'

  composers (sct: SetCollateralToken): BufferComposer[] {
    return [
      ComposableBuffer.varInt(() => sct.token, v => sct.token = v),
      ComposableBuffer.satoshiAsBigNumber(() => sct.factor, v => sct.factor = v),
      ComposableBuffer.single(() => sct.currencyPair, v => sct.currencyPair = v, sct => new CCurrencyPair(sct)),
      ComposableBuffer.uInt32(() => sct.activateAfterBlock, v => sct.activateAfterBlock = v)
    ]
  }
}

/**
 * SetLoanToken DeFi Transaction
 */
export interface SetLoanToken {
  symbol: string // -------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string, Symbol or id of collateral token
  name: string // ---------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string, Token's name, no longer than 128 characters
  currencyPair: CurrencyPair // -| c1 = VarUInt{1-9 bytes} + c1 bytes UTF encoded string for token + c2 = VarUInt{1-9 bytes} + c2 bytes UTF encoded string for currency, token/currency pair to use for price of token
  mintable: boolean // ----------| 1 byte, mintable, Token's 'Mintable' property
  interest: BigNumber // --------| 8 bytes unsigned, interest rate
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
      ComposableBuffer.compactSizeUtf8BE(() => slt.symbol, v => slt.symbol = v),
      ComposableBuffer.compactSizeUtf8BE(() => slt.name, v => slt.name = v),
      ComposableBuffer.single(() => slt.currencyPair, v => slt.currencyPair = v, v => new CCurrencyPair(v)),
      ComposableBuffer.uBool8(() => slt.mintable, v => slt.mintable = v),
      ComposableBuffer.satoshiAsBigNumber(() => slt.interest, v => slt.interest = v)
    ]
  }
}

/**
 * UpdateLoanToken DeFi Transaction
 */
export interface UpdateLoanToken {
  symbol: string // --------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string, Symbol or id of collateral token
  name: string // ----------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string, Token's name, no longer than 128 characters
  currencyPair: CurrencyPair // --| c1 = VarUInt{1-9 bytes} + c1 bytes UTF encoded string for token + c2 = VarUInt{1-9 bytes} + c2 bytes UTF encoded string for currency, token/currency pair to use for price of token
  mintable: boolean // -----------| 1 byte, mintable, Token's 'Mintable' property
  interest: BigNumber // ---------| 8 bytes unsigned, interest rate
  tokenTx: string // -------------| 32 bytes, hex string Txid of tokens's creation tx
}

/**
 * Composable UpdateLoanToken, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUpdateLoanToken extends ComposableBuffer<UpdateLoanToken> {
  static OP_CODE = 0x78 // 'x'
  static OP_NAME = 'OP_DEFI_TX_UPDATE_LOAN_TOKEN'

  composers (ult: UpdateLoanToken): BufferComposer[] {
    return [
      ComposableBuffer.compactSizeUtf8BE(() => ult.symbol, v => ult.symbol = v),
      ComposableBuffer.compactSizeUtf8BE(() => ult.name, v => ult.name = v),
      ComposableBuffer.single(() => ult.currencyPair, v => ult.currencyPair = v, v => new CCurrencyPair(v)),
      ComposableBuffer.uBool8(() => ult.mintable, v => ult.mintable = v),
      ComposableBuffer.satoshiAsBigNumber(() => ult.interest, v => ult.interest = v),
      ComposableBuffer.hexBEBufferLE(32, () => ult.tokenTx, v => ult.tokenTx = v)
    ]
  }
}

/**
 * TakeLoan DeFi Transaction
 */
export interface TakeLoan {
  vaultId: string // ------------------| 32 bytes, Id of vault used for loan
  to: Script // -----------------------| n = VarUInt{1-9 bytes}, + n bytes, Address to transfer tokens, empty stack when no address is specified.
  tokenAmounts: TokenBalanceUInt32[] // | c = VarUInt{1-9 bytes} + c x TokenBalance(4 bytes for token Id + 8 bytes for amount), loan token amounts
}

/**
 * Composable TakeLoan, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTakeLoan extends ComposableBuffer<TakeLoan> {
  static OP_CODE = 0x58 // 'X'
  static OP_NAME = 'OP_DEFI_TX_TAKE_LOAN'

  composers (tl: TakeLoan): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => tl.vaultId, v => tl.vaultId = v),
      ComposableBuffer.single<Script>(() => tl.to, v => tl.to = v, v => new CScript(v)),
      ComposableBuffer.compactSizeArray(() => tl.tokenAmounts, v => tl.tokenAmounts = v, v => new CTokenBalance(v))
    ]
  }
}

/**
 * PaybackLoan DeFi Transaction
 */
export interface PaybackLoan {
  vaultId: string // --------------------| 32 bytes, Vault Id
  from: Script // -----------------------| n = VarUInt{1-9 bytes}, + n bytes, Address containing collateral
  tokenAmounts: TokenBalanceUInt32[] // -| c = VarUInt{1-9 bytes} + c x TokenBalance(4 bytes for token Id + 8 bytes for amount), Amount to pay loan
}

/**
 * Composable PaybackLoan, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CPaybackLoan extends ComposableBuffer<PaybackLoan> {
  static OP_CODE = 0x48 // 'H'
  static OP_NAME = 'OP_DEFI_TX_PAYBACK_LOAN'

  composers (pl: PaybackLoan): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => pl.vaultId, v => pl.vaultId = v),
      ComposableBuffer.single<Script>(() => pl.from, v => pl.from = v, v => new CScript(v)),
      ComposableBuffer.compactSizeArray(() => pl.tokenAmounts, v => pl.tokenAmounts = v, v => new CTokenBalance(v))
    ]
  }
}

export interface TokenPayback {
  dToken: number // ---------------------| VarInt{MSB-b128}
  amounts: TokenBalanceUInt32[] // ------| c = VarUInt{1-9 bytes} + c x TokenBalance(4 bytes for token Id + 8 bytes for amount), Amount to pay loan
}

/**
 * Composable TokenPayback, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenPayback extends ComposableBuffer<TokenPayback> {
  composers (tp: TokenPayback): BufferComposer[] {
    return [
      ComposableBuffer.varInt(() => tp.dToken, v => tp.dToken = v),
      ComposableBuffer.compactSizeArray(() => tp.amounts, v => tp.amounts = v, v => new CTokenBalance(v))
    ]
  }
}

/**
 * PaybackLoanV2 DeFi Transaction
 */
export interface PaybackLoanV2 {
  vaultId: string // --------------------| 32 bytes, Vault Id
  from: Script // -----------------------| n = VarUInt{1-9 bytes}, + n bytes, Address containing collateral
  loans: TokenPayback[] // -------| c = VarUInt{1-9 bytes} + c x TokenBalance(4 bytes for token Id + 8 bytes for amount), Amount to pay loan
}

/**
 * Composable PaybackLoanV2, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CPaybackLoanV2 extends ComposableBuffer<PaybackLoanV2> {
  static OP_CODE = 0x6B // 'k'
  static OP_NAME = 'OP_DEFI_TX_PAYBACK_LOAN_V2'

  composers (pl: PaybackLoanV2): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => pl.vaultId, v => pl.vaultId = v),
      ComposableBuffer.single<Script>(() => pl.from, v => pl.from = v, v => new CScript(v)),
      ComposableBuffer.compactSizeArray(() => pl.loans, v => pl.loans = v, v => new CTokenPayback(v))
    ]
  }
}

/**
 * PaybackWithCollateral DeFi Transaction
 */
export interface PaybackWithCollateral {
  vaultId: string // --------------------| 32 bytes, Vault Id
}

/**
 * Composable PaybackWithCollateral, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CPaybackWithCollateral extends ComposableBuffer<PaybackWithCollateral> {
  static OP_CODE = 0x57 // 'W'
  static OP_NAME = 'OP_DEFI_TX_PAYBACK_WITH_COLLATERAL'

  composers (pwc: PaybackWithCollateral): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => pwc.vaultId, v => pwc.vaultId = v)
    ]
  }
}

/**
 * @deprecated
 */
export * from './dftx_vault'
