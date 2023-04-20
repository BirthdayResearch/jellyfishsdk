import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'
import { CScriptBalances, CTokenBalance, CTokenBalanceVarInt, ScriptBalances, TokenBalanceUInt32, TokenBalanceVarInt } from './dftx_balance'

/**
 * UtxosToAccount DeFi Transaction
 */
export interface UtxosToAccount {
  to: ScriptBalances[] // --------------| n = VarUInt{1-9 bytes}, + n bytes
}

/**
 * Composable UtxosToAccount, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUtxosToAccount extends ComposableBuffer<UtxosToAccount> {
  static OP_CODE = 0x55 // 'U'
  static OP_NAME = 'OP_DEFI_TX_UTXOS_TO_ACCOUNT'

  composers (u2a: UtxosToAccount): BufferComposer[] {
    return [
      ComposableBuffer.compactSizeArray(() => u2a.to, v => u2a.to = v, v => new CScriptBalances(v))
    ]
  }
}

/**
 * AccountToUtxos DeFi Transaction
 */
export interface AccountToUtxos {
  from: Script // -----------------------| n = VarUInt{1-9 bytes}, + n bytes
  balances: TokenBalanceUInt32[] // -----| c = VarUInt{1-9 bytes}, + c x TokenBalance
  mintingOutputsStart: number // --------| VarInt{MSB-b128}
}

/**
 * Composable AccountToUtxos, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CAccountToUtxos extends ComposableBuffer<AccountToUtxos> {
  static OP_CODE = 0x62 // 'b'
  static OP_NAME = 'OP_DEFI_TX_ACCOUNT_TO_UTXOS'

  composers (a2u: AccountToUtxos): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => a2u.from, v => a2u.from = v, v => new CScript(v)),
      ComposableBuffer.compactSizeArray(() => a2u.balances, v => a2u.balances = v, v => new CTokenBalance(v)),
      ComposableBuffer.varInt(() => a2u.mintingOutputsStart, v => a2u.mintingOutputsStart = v)
    ]
  }
}

/**
 * AccountToAccount DeFi Transaction
 */
export interface AccountToAccount {
  from: Script // ----------------------| n = VarUInt{1-9 bytes}, + n bytes
  to: ScriptBalances[] // --------------| n = VarUInt{1-9 bytes}, + n bytes
}

/**
 * Composable AccountToAccount, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CAccountToAccount extends ComposableBuffer<AccountToAccount> {
  static OP_CODE = 0x42 // 'B'
  static OP_NAME = 'OP_DEFI_TX_ACCOUNT_TO_ACCOUNT'

  composers (a2a: AccountToAccount): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => a2a.from, v => a2a.from = v, v => new CScript(v)),
      ComposableBuffer.compactSizeArray(() => a2a.to, v => a2a.to = v, v => new CScriptBalances(v))
    ]
  }
}

/**
 * AnyAccountToAccount DeFi Transaction
 */
export interface AnyAccountToAccount {
  from: ScriptBalances[] // ------------| n = VarUInt{1-9 bytes}, + n bytes
  to: ScriptBalances[] // --------------| n = VarUInt{1-9 bytes}, + n bytes
}

/**
 * Composable AnyAccountToAccount, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CAnyAccountToAccount extends ComposableBuffer<AnyAccountToAccount> {
  static OP_CODE = 0x61 // 'a'
  static OP_NAME = 'OP_DEFI_TX_ANY_ACCOUNT_TO_ACCOUNT'

  composers (aa2a: AnyAccountToAccount): BufferComposer[] {
    return [
      ComposableBuffer.compactSizeArray(() => aa2a.from, v => aa2a.from = v, v => new CScriptBalances(v)),
      ComposableBuffer.compactSizeArray(() => aa2a.to, v => aa2a.to = v, v => new CScriptBalances(v))
    ]
  }
}

/**
 * TransferBalance DeFi Transaction
 */
export enum TransferBalanceType {
  /** type for AccountToAccount transfer */
  AccountToAccount = 'acctoacc',
  /** type for EvmIn transfer */
  EvmIn = 'evmin',
  /** type for EvmOut transfer */
  EvmOut = 'evmout',
};

export interface TransferBalance {
  type: number // ----------------------| 1 byte, 0x00 (AccountToAccount) | 0x01 (EvmIn) | 0x02 (EvmOut)
  from: Script // ----------------------| n = VarUInt{1-9 bytes}, + n bytes
  to: ScriptBalances[] // --------------| n = VarUInt{1-9 bytes}, + n bytes
}

/**
 * Composable TransferBalance, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTransferBalance extends ComposableBuffer<TransferBalance> {
  static OP_CODE = 0x38 // '8'
  static OP_NAME = 'OP_DEFI_TX_TRANSFER_BALANCE'

  composers (a2a: TransferBalance): BufferComposer[] {
    return [
      ComposableBuffer.uInt8(() => a2a.type, v => a2a.type = v as TransferBalanceType),
      ComposableBuffer.compactSizeArray(() => a2a.to, v => a2a.to = v, v => new CScriptBalances(v)),
      ComposableBuffer.single<Script>(() => a2a.from, v => a2a.from = v, v => new CScript(v))
    ]
  }
}

/**
 * FutureSwap DeFi Transaction
 */
export interface SetFutureSwap {
  owner: Script // ----------------------| n = VarUInt{1-9 bytes}, + n bytes, Address used to fund contract with
  source: TokenBalanceVarInt // ---------| VarUInt{1-9 bytes} for token Id + 8 bytes for amount, Source amount in amount@token format
  destination: number // ----------------| 4 bytes unsigned, Destination dToken
  withdraw: boolean // ------------------| 1 byte, True if withdraw
}

/**
 * Composable FutureSwap, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CSetFutureSwap extends ComposableBuffer<SetFutureSwap> {
  static OP_CODE = 0x51 // 'Q'
  static OP_NAME = 'OP_DEFI_TX_FUTURE_SWAP'

  composers (sfs: SetFutureSwap): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => sfs.owner, v => sfs.owner = v, v => new CScript(v)),
      ComposableBuffer.single<TokenBalanceVarInt>(() => sfs.source, v => sfs.source = v, v => new CTokenBalanceVarInt(v)),
      ComposableBuffer.uInt32(() => sfs.destination, v => sfs.destination = v),
      ComposableBuffer.uBool8(() => sfs.withdraw, v => sfs.withdraw = v)
    ]
  }
}
