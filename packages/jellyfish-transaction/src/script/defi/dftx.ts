import { SmartBuffer } from "smart-buffer";
import { BufferComposer, ComposableBuffer } from "../../buffer/buffer_composer";
import {
  CPoolAddLiquidity,
  CPoolRemoveLiquidity,
  CPoolSwap,
  PoolAddLiquidity,
  PoolRemoveLiquidity,
  PoolSwap
} from "./dftx_pool";
import { CUnmappedOperation, UnmappedOperation } from "./dftx_unmapped";

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * DeFi Transaction
 */
export interface DfTx<T extends Operation> {
  signature: number // -------------------| 4 bytes, 0x44665478, DfTx
  type: number // ------------------------| 1 byte
  operation: T // ------------------------| varying bytes, 0-n

  /**
   * Not composed into buffer, for readability only.
   *
   * Name of operation in human readable string.
   * Structured as 'DEFI_OP_<...>'
   */
  name: string
}

/**
 * DeFi Transaction Operational Data
 * They are the data for the DEFI_OP_<...>
 * They can be empty, depending on the op type.
 */
export interface Operation {
}

export class CDfTx extends ComposableBuffer<DfTx<any>> {
  static SIGNATURE = 0x44665478

  composers (dftx: DfTx<any>): BufferComposer[] {
    return [
      CDfTx.signature(dftx),
      ComposableBuffer.uInt8(() => dftx.type, v => dftx.type = v),
      CDfTx.operation(dftx),
    ];
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
        buffer.writeUInt32BE(signature)
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
  static operation (dftx: DfTx<any>): BufferComposer {
    function compose<T extends Operation> (name: string, asC: (data: SmartBuffer | T) => ComposableBuffer<T>): BufferComposer {
      dftx.name = name
      return ComposableBuffer.single<T>(() => dftx.operation, v => dftx.operation = v, asC)
    }

    switch (dftx.type) {
      case CPoolSwap.TYPE:
        return compose<PoolSwap>("DEFI_OP_POOL_SWAP", d => new CPoolSwap(d))
      case CPoolAddLiquidity.TYPE:
        return compose<PoolAddLiquidity>("DEFI_OP_POOL_ADD_LIQUIDITY", d => new CPoolAddLiquidity(d))
      case CPoolRemoveLiquidity.TYPE:
        return compose<PoolRemoveLiquidity>("DEFI_OP_POOL_REMOVE_LIQUIDITY", d => new CPoolRemoveLiquidity(d))
      default:
        return compose<UnmappedOperation>("DEFI_OP_UNMAPPED", d => new CUnmappedOperation(d))
    }
  }
}
