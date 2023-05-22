import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

/**
 * EvmTx Transaction
 */
export interface EvmTx {
  from: Script // ---------------------| n = VarUInt{1-9 bytes}, + n bytes, wrapped ETH address to transfer from
  nonce: number // --------------------| VarInt{MSB-b128}
  gasPrice: number // -----------------| VarInt{MSB-b128}
  gasLimit: number // -----------------| VarInt{MSB-b128}
  to: Script // -----------------------| n = VarUInt{1-9 bytes}, + n bytes, wrapped ETH address to transfer to
  value: BigNumber // -----------------| 8 bytes unsigned
  // data: string // ---------------------| hex string
}

/**
 * Composable EvmTx, C stands for Composable
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CEvmTx extends ComposableBuffer<EvmTx> {
  static OP_CODE = 0x39 // '9'
  static OP_NAME = 'OP_DEFI_TX_EVM_TX'

  composers (e: EvmTx): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => e.from, v => e.from = v, v => new CScript(v)),
      ComposableBuffer.varInt(() => e.nonce, (v) => (e.nonce = v)),
      ComposableBuffer.varInt(() => e.gasPrice, (v) => (e.gasPrice = v)),
      ComposableBuffer.varInt(() => e.gasLimit, (v) => (e.gasLimit = v)),
      ComposableBuffer.single<Script>(() => e.to, v => e.to = v, v => new CScript(v)),
      ComposableBuffer.satoshiAsBigNumber(() => e.value, (v) => (e.value = v))
      // ComposableBuffer.compactSizeUtf8BE(() => e.data, (v) => (e.data = v))
    ]
  }
}
