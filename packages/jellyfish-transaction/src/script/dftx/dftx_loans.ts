import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import { CTokenBalance, CTokenBalanceVarInt, TokenBalance, TokenBalanceVarInt } from './dftx_balance'
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
 * DestroyLoanScheme DeFi Transaction
 */
export interface DestroyLoanScheme {
  identifier: string // ------------------| c = VarUInt{1-9 bytes} + c bytes UTF encoded string, Unique identifier of the loan scheme
  height: BigNumber // -------------------| 8 bytes unsigned integer, Activation block height
}

/**
 * SetDefaultLoanScheme DeFi Transaction
 */
export interface SetDefaultLoanScheme {
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string, Unique identifier of the loan scheme
}

/**
 * SetCollateralToken DeFi Transaction
 */
export interface SetCollateralToken {
  token: number // ----------------| VarUInt{1-9 bytes}, Symbol or id of collateral token
  factor: BigNumber // ------------| 8 bytes unsigned, Collateralization factor
  currencyPair: CurrencyPair // ---| c1 = VarUInt{1-9 bytes} + c1 bytes UTF encoded string for token + c2 = VarUInt{1-9 bytes} + c2 bytes UTF encoded string for currency, token/currency pair to use for price of token
  activateAfterBlock: number // ---| 4 bytes unsigned, Changes will be active after the block height
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
      ComposableBuffer.varUIntUtf8BE(() => sls.identifier, v => sls.identifier = v),
      ComposableBuffer.bigNumberUInt64(() => sls.update, v => sls.update = v)
    ]
  }
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
      ComposableBuffer.varUIntUtf8BE(() => dls.identifier, v => dls.identifier = v),
      ComposableBuffer.bigNumberUInt64(() => dls.height, v => dls.height = v)
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
 * Composable SetCollateralToken, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CSetCollateralToken extends ComposableBuffer<SetCollateralToken> {
  static OP_CODE = 0x63 // 'c'
  static OP_NAME = 'OP_DEFI_TX_SET_COLLATERAL_TOKEN'

  composers (sct: SetCollateralToken): BufferComposer[] {
    return [
      ComposableBuffer.varUInt(() => sct.token, v => sct.token = v),
      ComposableBuffer.satoshiAsBigNumber(() => sct.factor, v => sct.factor = v),
      ComposableBuffer.single(() => sct.currencyPair, v => sct.currencyPair = v, sct => new CCurrencyPair(sct)),
      ComposableBuffer.uInt32(() => sct.activateAfterBlock, v => sct.activateAfterBlock = v)
    ]
  }
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
      ComposableBuffer.single(() => slt.currencyPair, v => slt.currencyPair = v, v => new CCurrencyPair(v)),
      ComposableBuffer.uBool8(() => slt.mintable, v => slt.mintable = v),
      ComposableBuffer.satoshiAsBigNumber(() => slt.interest, v => slt.interest = v)
    ]
  }
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
      ComposableBuffer.varUIntUtf8BE(() => ult.symbol, v => ult.symbol = v),
      ComposableBuffer.varUIntUtf8BE(() => ult.name, v => ult.name = v),
      ComposableBuffer.single(() => ult.currencyPair, v => ult.currencyPair = v, v => new CCurrencyPair(v)),
      ComposableBuffer.uBool8(() => ult.mintable, v => ult.mintable = v),
      ComposableBuffer.satoshiAsBigNumber(() => ult.interest, v => ult.interest = v),
      ComposableBuffer.hexBEBufferLE(32, () => ult.tokenTx, v => ult.tokenTx = v)
    ]
  }
}

/**
 * CreateVault DeFi Transaction
 */
export interface CreateVault {
  ownerAddress: Script // --------------------| n = VarUInt{1-9 bytes}, + n bytes, Vault's owner address
  schemeId: string // ------------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string, Vault's loan scheme id
}

/**
 * Composable CreateVault, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CCreateVault extends ComposableBuffer<CreateVault> {
  static OP_CODE = 0x56 // 'V'
  static OP_NAME = 'OP_DEFI_TX_CREATE_VAULT'

  composers (cv: CreateVault): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => cv.ownerAddress, v => cv.ownerAddress = v, v => new CScript(v)),
      ComposableBuffer.varUIntUtf8BE(() => cv.schemeId, v => cv.schemeId = v)
    ]
  }
}

/**
 * UpdateVault DeFi Transaction
 */
export interface UpdateVault {
  vaultId: string // -------------------------| 32 bytes hex string
  ownerAddress: Script // --------------------| n = VarUInt{1-9 bytes}, + n bytes, Vault's owner address
  schemeId: string // ------------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string, Vault's loan scheme id
}

/**
 * Composable UpdateVault, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUpdateVault extends ComposableBuffer<UpdateVault> {
  static OP_CODE = 0x76 // 'v'
  static OP_NAME = 'OP_DEFI_TX_UPDATE_VAULT'

  composers (uv: UpdateVault): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => uv.vaultId, v => uv.vaultId = v),
      ComposableBuffer.single<Script>(() => uv.ownerAddress, v => uv.ownerAddress = v, v => new CScript(v)),
      ComposableBuffer.varUIntUtf8BE(() => uv.schemeId, v => uv.schemeId = v)
    ]
  }
}

/**
 * DepositToVault DeFi Transaction
 */
export interface DepositToVault {
  vaultId: string // ------------------| 32 bytes, Vault Id
  from: Script // ---------------------| n = VarUInt{1-9 bytes}, + n bytes, Address containing collateral
  tokenAmount: TokenBalanceVarInt // --| VarUInt{1-9 bytes} for token Id + 8 bytes for amount, Amount of collateral
}

/**
 * Composable DepositToVault, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CDepositToVault extends ComposableBuffer<DepositToVault> {
  static OP_CODE = 0x53 // 'S'
  static OP_NAME = 'OP_DEFI_TX_DEPOSIT_TO_VAULT'

  composers (dtv: DepositToVault): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => dtv.vaultId, v => dtv.vaultId = v),
      ComposableBuffer.single<Script>(() => dtv.from, v => dtv.from = v, v => new CScript(v)),
      ComposableBuffer.single<TokenBalanceVarInt>(() => dtv.tokenAmount, v => dtv.tokenAmount = v, v => new CTokenBalanceVarInt(v))
    ]
  }
}

/**
 * WithdrawFromVault DeFi Transaction
 */
export interface WithdrawFromVault {
  vaultId: string // ------------------| 32 bytes, Vault Id
  to: Script // -----------------------| n = VarUInt{1-9 bytes}, + n bytes, Address to receive withdrawn collateral
  tokenAmount: TokenBalanceVarInt // --| VarUInt{1-9 bytes} for token Id + 8 bytes for amount, Amount of collateral
}

/**
 * Composable WithdrawFromVault, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CWithdrawFromVault extends ComposableBuffer<WithdrawFromVault> {
  static OP_CODE = 0x4A // 'J'
  static OP_NAME = 'OP_DEFI_TX_WITHDRAW_FROM_VAULT'

  composers (dtv: WithdrawFromVault): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => dtv.vaultId, v => dtv.vaultId = v),
      ComposableBuffer.single<Script>(() => dtv.to, v => dtv.to = v, v => new CScript(v)),
      ComposableBuffer.single<TokenBalanceVarInt>(() => dtv.tokenAmount, v => dtv.tokenAmount = v, v => new CTokenBalanceVarInt(v))
    ]
  }
}

/**
 * TakeLoan DeFi Transaction
 */
export interface TakeLoan {
  vaultId: string // ------------------| 32 bytes, Id of vault used for loan
  to: Script // -----------------------| n = VarUInt{1-9 bytes}, + n bytes, Address to transfer tokens, empty stack when no address is specified.
  tokenAmounts: TokenBalance[] // -----| c = VarUInt{1-9 bytes} + c x TokenBalance(4 bytes for token Id + 8 bytes for amount), loan token amounts
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
      ComposableBuffer.varUIntArray(() => tl.tokenAmounts, v => tl.tokenAmounts = v, v => new CTokenBalance(v))
    ]
  }
}

/**
 * PaybackLoan DeFi Transaction
 */
export interface PaybackLoan {
  vaultId: string // --------------------| 32 bytes, Vault Id
  from: Script // -----------------------| n = VarUInt{1-9 bytes}, + n bytes, Address containing collateral
  tokenAmounts: TokenBalance[] // -------| c = VarUInt{1-9 bytes} + c x TokenBalance(4 bytes for token Id + 8 bytes for amount), Amount to pay loan
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
      ComposableBuffer.varUIntArray(() => pl.tokenAmounts, v => pl.tokenAmounts = v, v => new CTokenBalance(v))
    ]
  }
}

/**
 * CloseVault DeFi Transaction
 */
export interface CloseVault {
  vaultId: string // ------------------| 32 bytes, Vault Id
  to: Script // -----------------------| n = VarUInt{1-9 bytes}, + n bytes, Address
}

/**
 * Composable CloseVault, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CCloseVault extends ComposableBuffer<CloseVault> {
  static OP_CODE = 0x65 // 'e'
  static OP_NAME = 'OP_DEFI_TX_CLOSE_VAULT'

  composers (cv: CloseVault): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => cv.vaultId, v => cv.vaultId = v),
      ComposableBuffer.single<Script>(() => cv.to, v => cv.to = v, v => new CScript(v))
    ]
  }
}

/**
 * PlaceAuctionBid DeFi Transaction
 */
export interface PlaceAuctionBid {
  vaultId: string // ------------------| 32 bytes, Vault Id
  index: number // --------------------| 4 bytes, Auction batches index
  from: Script // ---------------------| n = VarUInt{1-9 bytes}, + n bytes, Address containing collateral
  tokenAmount: TokenBalanceVarInt // --| VarUInt{1-9 bytes} for token Id + 8 bytes for amount, Amount of collateral
}

/**
 * Composable PlaceAuctionBid, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CPlaceAuctionBid extends ComposableBuffer<PlaceAuctionBid> {
  static OP_CODE = 0x49 // 'I'
  static OP_NAME = 'OP_DEFI_TX_AUCTION_BID'

  composers (pab: PlaceAuctionBid): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => pab.vaultId, v => pab.vaultId = v),
      ComposableBuffer.uInt32(() => pab.index, v => pab.index = v),
      ComposableBuffer.single<Script>(() => pab.from, v => pab.from = v, v => new CScript(v)),
      ComposableBuffer.single<TokenBalanceVarInt>(() => pab.tokenAmount, v => pab.tokenAmount = v, v => new CTokenBalanceVarInt(v))
    ]
  }
}
