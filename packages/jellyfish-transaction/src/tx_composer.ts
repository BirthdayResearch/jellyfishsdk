import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer } from './buffer/buffer_composer'
import { Script, Transaction, TransactionSegWit, Vin, Vout, Witness, WitnessScript } from './tx'
import { OP_CODES, OPCode } from './script'
import { readVarUInt, writeVarUInt } from './buffer/buffer_varuint'
import { dSHA256 } from '@defichain/jellyfish-crypto'

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
      ComposableBuffer.varUIntArray<Vout>(() => tx.vout, v => tx.vout = v, v => {
        if (tx.version < 4) {
          return new CVoutV2(v)
        }
        return new CVoutV4(v)
      }),
      ComposableBuffer.uInt32(() => tx.lockTime, v => tx.lockTime = v)
    ]
  }

  /**
   * TransactionId is the double SHA256 of transaction buffer.
   * TxId are usually presented in BE order, this method return TxId in BE order.
   *
   * @return string transaction id
   */
  public get txId (): string {
    const buffer: SmartBuffer = new SmartBuffer()
    this.toBuffer(buffer)
    const hash = dSHA256(buffer.toBuffer())
    return hash.reverse().toString('hex')
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
      // defid returns txid in BE order hence we need to reverse it
      ComposableBuffer.hexBEBufferLE(32, () => vin.txid, v => vin.txid = v),
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
 *
 * This is Transaction V2 buffer composition
 */
export class CVoutV2 extends ComposableBuffer<Vout> implements Vout {
  public get value (): BigNumber {
    return this.data.value
  }

  public get script (): Script {
    return this.data.script
  }

  public get tokenId (): number {
    return 0x00
  }

  composers (vout: Vout): BufferComposer[] {
    return [
      ComposableBuffer.satoshiAsBigNumber(() => vout.value, v => vout.value = v),
      ComposableBuffer.single<Script>(() => vout.script, v => vout.script = v, v => new CScript(v))
    ]
  }
}

/**
 * Composable Vout, C stands for Composable.
 * Immutable by design, it implements the Vout interface for convenience.
 * Bi-directional fromBuffer, toBuffer deep composer.
 *
 * This is Transaction V4 buffer composition
 */
export class CVoutV4 extends ComposableBuffer<Vout> implements Vout {
  public get value (): BigNumber {
    return this.data.value
  }

  public get script (): Script {
    return this.data.script
  }

  public get tokenId (): number {
    return this.data.tokenId
  }

  // ISSUE(canonbrother): nValue same as value, nTokenId same as tokenId, its inconsistent vout struct issue
  // https://github.com/DeFiCh/ain/blob/c812f0283a52840996659121a755a9f723be2392/src/masternodes/mn_checks.cpp#L441-L442
  public get nValue (): BigNumber | undefined {
    return this.data?.nValue
  }

  public get nTokenId (): number | undefined {
    return this.data?.nTokenId
  }

  composers (vout: Vout): BufferComposer[] {
    if (vout.nValue !== undefined && vout.nTokenId !== undefined) {
      let nValue = vout.nValue
      let nTokenId = vout.nTokenId
      return [
        ComposableBuffer.satoshiAsBigNumber(() => nValue, v => nValue = v),
        ComposableBuffer.single<Script>(() => vout.script, v => vout.script = v, v => new CScript(v)),
        ComposableBuffer.varUInt(() => nTokenId, v => nTokenId = v)
      ]
    }
    return [
      ComposableBuffer.satoshiAsBigNumber(() => vout.value, v => vout.value = v),
      ComposableBuffer.single<Script>(() => vout.script, v => vout.script = v, v => new CScript(v)),
      ComposableBuffer.varUInt(() => vout.tokenId, v => vout.tokenId = v)
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
          script.stack = OP_CODES.fromBuffer(buffer)
        },
        toBuffer: (buffer: SmartBuffer): void => {
          OP_CODES.toBuffer(script.stack, buffer)
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
      ComposableBuffer.varUIntArray<Vout>(() => tx.vout, v => tx.vout = v, v => {
        if (tx.version < 4) {
          return new CVoutV2(v)
        }
        return new CVoutV4(v)
      }),
      ComposableBuffer.array<Witness>(() => tx.witness, v => tx.witness = v, v => new CWitness(v), () => tx.vin.length),
      ComposableBuffer.uInt32(() => tx.lockTime, v => tx.lockTime = v)
    ]
  }

  /**
   * TransactionId is the double SHA256 of transaction buffer.
   * TxId are usually presented in BE order, this method return TxId in BE order.
   *
   * @return string transaction id
   */
  public get txId (): string {
    return new CTransaction(this).txId
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
