import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import BigNumber from 'bignumber.js'
import { Script } from '@defichain/jellyfish-transaction/tx'
import { CScript } from '@defichain/jellyfish-transaction/tx_composer'

/**
 * CreateLoanScheme DeFi Transaction
 */
export interface CreateLoanScheme {
  ratio: number // -----------------------| 4 bytes unsigned
  rate: BigNumber // ---------------------| 8 bytes unsigned
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
  update: BigNumber // -------------------| 8 bytes unsigned integer, activation block height. 0 for createLoanScheme, > 0 for updateLoanScheme
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
export class CCreateLoanScheme extends ComposableBuffer<CreateLoanScheme> {
  static OP_CODE = 0x4c // 'L'
  static OP_NAME = 'OP_DEFI_TX_CREATE_LOAN_SCHEME'

  composers (cls: CreateLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => cls.ratio, v => cls.ratio = v),
      ComposableBuffer.satoshiAsBigNumber(() => cls.rate, v => cls.rate = v),
      ComposableBuffer.varUIntUtf8BE(() => cls.identifier, v => cls.identifier = v),
      ComposableBuffer.bigNumberUInt64(() => cls.update, v => cls.update = v)
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
      ComposableBuffer.varUIntUtf8BE(() => dls.identifier, v => dls.identifier = v),
      ComposableBuffer.bigNumberUInt64(() => dls.height, v => dls.height = v)
    ]
  }
}

/**
 * CreateVault DeFi Transaction
 */
export interface CreateVault {
  ownerAddress: Script // --------------------| n = VarUInt{1-9 bytes}, + n bytes, Vault's owner address
  schemeId: string // --------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string, Vault's loan scheme id
  isUnderLiquidation: boolean // -------------| 1 byte, Vault is under liquidation
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
      ComposableBuffer.varUIntUtf8BE(() => cv.schemeId, v => cv.schemeId = v),
      ComposableBuffer.uBool8(() => cv.isUnderLiquidation, v => cv.isUnderLiquidation = v)
    ]
  }
}
