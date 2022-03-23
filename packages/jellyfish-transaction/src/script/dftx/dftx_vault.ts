import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import { CTokenBalanceVarInt, TokenBalanceVarInt } from './dftx_balance'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

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
