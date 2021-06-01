import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import {
  AccountToAccount,
  AccountToUtxos,
  AnyAccountToAccount,
  CAccountToAccount,
  CAccountToUtxos,
  CAnyAccountToAccount,
  CUtxosToAccount,
  UtxosToAccount
} from './dftx_account'
import { CCreateMasterNode, CreateMasterNode, CResignMasterNode, ResignMasterNode } from './dftx_masternode'
import { CAutoAuthPrep } from './dftx_misc'
import {
  CPoolAddLiquidity, CPoolRemoveLiquidity, CPoolSwap, PoolAddLiquidity, PoolRemoveLiquidity,
  PoolSwap
} from './dftx_pool'
import { CTokenCreate, CTokenMint, CTokenUpdate, CTokenUpdateAny, TokenCreate, TokenMint, TokenUpdate, TokenUpdateAny } from './dftx_token'
import {
  CAppointOracle,
  AppointOracle,
  CUpdateOracle,
  UpdateOracle,
  CRemoveOracle,
  RemoveOracle,
  CSetOracleData,
  SetOracleData
} from './dftx_oracles'
import { CDeFiOpUnmapped, DeFiOpUnmapped } from './dftx_unmapped'
import { CSetGovernance, SetGovernance } from './dftx_governance'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * DeFi Transaction
 * [OP_RETURN, OP_PUSHDATA] Custom Transaction
 */
export interface DfTx<T> {
  signature: number // -------------------| 4 bytes, 0x44665478, DfTx
  type: number // ------------------------| 1 byte
  data: T // -----------------------------| varying bytes, 0-n

  /**
   * Not composed into buffer, for readability only.
   *
   * Name of operation in human readable string.
   * Structured as 'OP_DEFI_TX_<...>'
   */
  name: string
}

/**
 * Composable DfTx, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CDfTx extends ComposableBuffer<DfTx<any>> {
  static SIGNATURE = 0x44665478

  composers (dftx: DfTx<any>): BufferComposer[] {
    return [
      CDfTx.signature(dftx),
      ComposableBuffer.uInt8(() => dftx.type, v => dftx.type = v),
      {
        // This is not exactly an performant design, but it is succinct
        fromBuffer (buffer: SmartBuffer) {
          return CDfTx.data(dftx).fromBuffer(buffer)
        },
        toBuffer (buffer: SmartBuffer) {
          return CDfTx.data(dftx).toBuffer(buffer)
        }
      }
    ]
  }

  /**
   * Signature read/write with error handling if not recognized
   */
  static signature (dftx: DfTx<any>): BufferComposer {
    return {
      fromBuffer (buffer: SmartBuffer): void {
        const signature = buffer.readUInt32BE()
        if (signature !== CDfTx.SIGNATURE) {
          throw new Error(`CDfTx attempt to read a signature that is not recognized: ${signature}`)
        }
        dftx.signature = signature
      },
      toBuffer (buffer: SmartBuffer): void {
        if (dftx.signature !== CDfTx.SIGNATURE) {
          throw new Error(`CDfTx attempt to write a signature that is not recognized: ${dftx.signature}`)
        }
        buffer.writeUInt32BE(dftx.signature)
      }
    }
  }

  /**
   * Operation data read/write composing
   */
  static data (dftx: DfTx<any>): BufferComposer {
    function compose<T> (name: string, asC: (data: SmartBuffer | T) => ComposableBuffer<T>): BufferComposer {
      dftx.name = name
      return ComposableBuffer.single<T>(() => dftx.data, v => dftx.data = v, asC)
    }

    switch (dftx.type) {
      case CPoolSwap.OP_CODE:
        return compose<PoolSwap>(CPoolSwap.OP_NAME, d => new CPoolSwap(d))
      case CPoolAddLiquidity.OP_CODE:
        return compose<PoolAddLiquidity>(CPoolAddLiquidity.OP_NAME, d => new CPoolAddLiquidity(d))
      case CPoolRemoveLiquidity.OP_CODE:
        return compose<PoolRemoveLiquidity>(CPoolRemoveLiquidity.OP_NAME, d => new CPoolRemoveLiquidity(d))
      case CTokenMint.OP_CODE:
        return compose<TokenMint>(CTokenMint.OP_NAME, d => new CTokenMint(d))
      case CTokenCreate.OP_CODE:
        return compose<TokenCreate>(CTokenCreate.OP_NAME, d => new CTokenCreate(d))
      case CTokenUpdate.OP_CODE:
        return compose<TokenUpdate>(CTokenUpdate.OP_NAME, d => new CTokenUpdate(d))
      case CTokenUpdateAny.OP_CODE:
        return compose<TokenUpdateAny>(CTokenUpdateAny.OP_NAME, d => new CTokenUpdateAny(d))
      case CUtxosToAccount.OP_CODE:
        return compose<UtxosToAccount>(CUtxosToAccount.OP_NAME, d => new CUtxosToAccount(d))
      case CAccountToUtxos.OP_CODE:
        return compose<AccountToUtxos>(CAccountToUtxos.OP_NAME, d => new CAccountToUtxos(d))
      case CAccountToAccount.OP_CODE:
        return compose<AccountToAccount>(CAccountToAccount.OP_NAME, d => new CAccountToAccount(d))
      case CAnyAccountToAccount.OP_CODE:
        return compose<AnyAccountToAccount>(CAnyAccountToAccount.OP_NAME, d => new CAnyAccountToAccount(d))
      case CAppointOracle.OP_CODE:
        return compose<AppointOracle>(CAppointOracle.OP_NAME, d => new CAppointOracle(d))
      case CRemoveOracle.OP_CODE:
        return compose<RemoveOracle>(CRemoveOracle.OP_NAME, d => new CRemoveOracle(d))
      case CUpdateOracle.OP_CODE:
        return compose<UpdateOracle>(CUpdateOracle.OP_NAME, d => new CUpdateOracle(d))
      case CSetOracleData.OP_CODE:
        return compose<SetOracleData>(CSetOracleData.OP_NAME, d => new CSetOracleData(d))
      case CAutoAuthPrep.OP_CODE:
        return compose(CAutoAuthPrep.OP_NAME, () => new CAutoAuthPrep())
      case CCreateMasterNode.OP_CODE:
        return compose<CreateMasterNode>(CCreateMasterNode.OP_NAME, d => new CCreateMasterNode(d))
      case CResignMasterNode.OP_CODE:
        return compose<ResignMasterNode>(CResignMasterNode.OP_NAME, d => new CResignMasterNode(d))
      case CSetGovernance.OP_CODE:
        return compose<SetGovernance>(CSetGovernance.OP_NAME, d => new CSetGovernance(d))
      default:
        return compose<DeFiOpUnmapped>(CDeFiOpUnmapped.OP_NAME, d => new CDeFiOpUnmapped(d))
    }
  }
}
