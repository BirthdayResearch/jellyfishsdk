import { BufferComposer, ComposableBuffer, readBigNumberUInt64, writeBigNumberUInt64 } from '@defichain/jellyfish-buffer'
import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'

/**
 * LoanScheme DeFi Transaction
 */
export interface LoanScheme {
  ratio: number // -----------------------| 4 bytes unsigned
  rate: BigNumber // ---------------------| 8 bytes unsigned
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
  update?: BigNumber // ------------------| 8 bytes unsigned integer, activation block height. 0 for createLoanScheme, > 0 for updateLoanScheme
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
export class CCreateLoanScheme extends ComposableBuffer<LoanScheme> {
  static OP_CODE = 0x4c // 'L'
  static OP_NAME = 'OP_DEFI_TX_CREATE_LOAN_SCHEME'

  composers (cls: LoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => cls.ratio, v => cls.ratio = v),
      ComposableBuffer.satoshiAsBigNumber(() => cls.rate, v => cls.rate = v),
      ComposableBuffer.varUIntUtf8BE(() => cls.identifier, v => cls.identifier = v),
      ComposableBuffer.bigNumberUInt64(() => cls.update ?? new BigNumber('0xffffffffffffffff'), v => cls.update = v)
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
 * Composable UpdateLoanScheme, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUpdateLoanScheme extends ComposableBuffer<LoanScheme> {
  static OP_CODE = 0x4c // 'L'
  static OP_NAME = 'OP_DEFI_TX_UPDATE_LOAN_SCHEME'

  composers (uls: LoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => uls.ratio, v => uls.ratio = v),
      ComposableBuffer.satoshiAsBigNumber(() => uls.rate, v => uls.rate = v),
      ComposableBuffer.varUIntUtf8BE(() => uls.identifier, v => uls.identifier = v),
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          const num = readBigNumberUInt64(buffer)
          if (num.isLessThan(new BigNumber('0xffffffffffffffff'))) {
            uls.update = num
          }
        },
        toBuffer: (buffer: SmartBuffer): void => {
          if (uls.update !== undefined) {
            writeBigNumberUInt64(uls.update, buffer)
          } else {
            writeBigNumberUInt64(new BigNumber('0xffffffffffffffff'), buffer)
          }
        }
      }
    ]
  }
}
