import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer } from './buffer/buffer_composer'
import {
  Script,
  TransactionSegWit,
  Transaction,
  Vin,
  Vout,
  Witness, WitnessScript
} from './tx'

import scriptComposer, { OPCode } from './script'
import { readVarUInt, writeVarUInt } from './buffer/buffer_varuint'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * USE CTransaction AT YOUR OWN RISK.
 * The TransactionBuilder has safety logic built-in to prevent overspent, CTransaction is its raw counter part.
 *
 * Composable Transaction, C stands for Composable.
 * Immutable by design, it implements the Transaction interface for convenience.
 * Bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTransaction extends ComposableBuffer<Transaction> implements Transaction {
  public get version (): number {
    return this.data.version
  }

  public get vin (): Vin[] {
    return this.data.vin
  }

  public get vout (): Vout[] {
    return this.data.vout
  }

  public get lockTime (): number {
    return this.data.lockTime
  }

  composers (tx: Transaction): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => tx.version, v => tx.version = v),
      ComposableBuffer.varUIntArray<Vin>(() => tx.vin, v => tx.vin = v, v => new CVin(v)),
      ComposableBuffer.varUIntArray<Vout>(() => tx.vout, v => tx.vout = v, v => new CVout(v)),
      ComposableBuffer.uInt32(() => tx.lockTime, v => tx.lockTime = v)
    ]
  }
}

/**
 * Composable Vin, C stands for Composable.
 * Immutable by design, it implements the Vin interface for convenience.
 * Bi-directional fromBuffer, toBuffer deep composer.
 */
export class CVin extends ComposableBuffer<Vin> implements Vin {
  /**
   * 32 bytes, 64 in hex
   */
  public get txid (): string {
    return this.data.txid
  }

  public get index (): number {
    return this.data.index
  }

  public get script (): Script {
    return this.data.script
  }

  public get sequence (): number {
    return this.data.sequence
  }

  composers (vin: Vin): BufferComposer[] {
    return [
      ComposableBuffer.hex(32, () => vin.txid, v => vin.txid = v),
      ComposableBuffer.uInt32(() => vin.index, v => vin.index = v),
      ComposableBuffer.single<Script>(() => vin.script, v => vin.script = v, v => new CScript(v)),
      ComposableBuffer.uInt32(() => vin.sequence, v => vin.sequence = v)
    ]
  }
}

/**
 * Composable Vout, C stands for Composable.
 * Immutable by design, it implements the Vout interface for convenience.
 * Bi-directional fromBuffer, toBuffer deep composer.
 */
export class CVout extends ComposableBuffer<Vout> implements Vout {
  public get value (): BigNumber {
    return this.data.value
  }

  public get script (): Script {
    return this.data.script
  }

  public get dct_id (): number {
    return this.data.dct_id
  }

  composers (vout: Vout): BufferComposer[] {
    const DIGIT_8 = new BigNumber('100000000')

    return [
      ComposableBuffer.bigUInt64(() => {
        return BigInt(vout.value.multipliedBy(DIGIT_8).toString(10))
      }, v => {
        vout.value = new BigNumber(v.toString()).dividedBy(DIGIT_8)
      }),
      ComposableBuffer.single<Script>(() => vout.script, v => vout.script = v, v => new CScript(v)),
      ComposableBuffer.uInt8(() => vout.dct_id, v => vout.dct_id = v)
    ]
  }
}

/**
 * Composable Script, C stands for Composable.
 * Immutable by design, it implements the Script interface for convenience.
 * Bi-directional fromBuffer, toBuffer deep composer.
 *
 * This wraps the OPCode built in composer.
 */
export class CScript extends ComposableBuffer<Script> implements Script {
  public get stack (): OPCode[] {
    return this.data.stack
  }

  composers (script: Script): BufferComposer[] {
    return [
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          script.stack = scriptComposer.fromBufferToOpCodes(buffer)
        },
        toBuffer: (buffer: SmartBuffer): void => {
          scriptComposer.fromOpCodesToBuffer(script.stack, buffer)
        }
      }
    ]
  }
}

/**
 * USE CTransactionSegWit AT YOUR OWN RISK.
 * The TransactionBuilder has safety logic built-in to prevent overspent, CTransactionSegWit is its raw counter part.
 *
 * Composable TransactionSegWit, C stands for Composable.
 * Immutable by design, it implements the TransactionSegWit interface for convenience.
 * Bi-directional fromBuffer, toBuffer deep composer.
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
 * @see https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki
 * @see https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki
 */
export class CTransactionSegWit extends ComposableBuffer<TransactionSegWit> implements TransactionSegWit {
  public get version (): number {
    return this.data.version
  }

  public get marker (): number {
    return this.data.marker
  }

  public get flag (): number {
    return this.data.flag
  }

  public get vin (): Vin[] {
    return this.data.vin
  }

  public get vout (): Vout[] {
    return this.data.vout
  }

  public get witness (): Witness[] {
    return this.data.witness
  }

  public get lockTime (): number {
    return this.data.lockTime
  }

  composers (tx: TransactionSegWit): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => tx.version, v => tx.version = v),
      ComposableBuffer.uInt8(() => tx.marker, v => tx.marker = v),
      ComposableBuffer.uInt8(() => tx.flag, v => tx.flag = v),
      ComposableBuffer.varUIntArray<Vin>(() => tx.vin, v => tx.vin = v, v => new CVin(v)),
      ComposableBuffer.varUIntArray<Vout>(() => tx.vout, v => tx.vout = v, v => new CVout(v)),
      ComposableBuffer.array<Witness>(() => tx.witness, v => tx.witness = v, v => new CWitness(v), () => tx.vin.length),
      ComposableBuffer.uInt32(() => tx.lockTime, v => tx.lockTime = v)
    ]
  }
}

/**
 * Composable Witness, C stands for Composable.
 * Immutable by design, it implements the Witness interface for convenience.
 * Bi-directional fromBuffer, toBuffer deep composer.
 */
export class CWitness extends ComposableBuffer<Witness> implements Witness {
  public get scripts (): WitnessScript[] {
    return this.data.scripts
  }

  composers (wit: Witness): BufferComposer[] {
    return [
      ComposableBuffer.varUIntArray<WitnessScript>(() => wit.scripts, v => wit.scripts = v, v => new CWitnessScript(v))
    ]
  }
}

/**
 * Composable WitnessScript, C stands for Composable.
 * Immutable by design, it implements the WitnessScript interface for convenience.
 * Bi-directional fromBuffer, toBuffer deep composer.
 *
 * This just wraps the WitnessScript with (n = VarUInt, + n Bytes).
 */
export class CWitnessScript extends ComposableBuffer<WitnessScript> implements WitnessScript {
  public get hex (): string {
    return this.data.hex
  }

  composers (script: WitnessScript): BufferComposer[] {
    return [
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          const len = readVarUInt(buffer)
          script.hex = buffer.readString(len, 'hex')
        },
        toBuffer: (buffer: SmartBuffer): void => {
          writeVarUInt(script.hex.length / 2, buffer)
          buffer.writeString(script.hex, 'hex')
        }
      }
    ]
  }
}
