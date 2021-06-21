import {
  Transaction,
  TransactionSegWit,
  Witness,
  DeFiTransactionConstants,
  SIGHASH
} from '@defichain/jellyfish-transaction'
import { SignInputOption, SegWitSigner } from './segwit_signature'

export interface SignOption {
  sigHashType?: SIGHASH
  validate?: {
    version?: boolean
    lockTime?: boolean
  }
}

/**
 * TransactionSigner
 * 1. you can sign an unsigned transaction and get a signed transaction.
 * 2. you can sign a vin and get a witness in tx for that vin
 *
 * https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki
 * https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki
 * https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
 */
export const TransactionSigner = {

  /**
   * @param {Transaction} transaction to sign
   * @param {number} index of the vin to sign
   * @param {SignInputOption} option input option
   * @param {SIGHASH} sigHashType SIGHASH type
   */
  async signInput (transaction: Transaction, index: number, option: SignInputOption, sigHashType: SIGHASH = SIGHASH.ALL): Promise<Witness> {
    return await SegWitSigner.signInput(transaction, index, option, sigHashType)
  },

  async sign (transaction: Transaction, inputOptions: SignInputOption[], option: SignOption = {}): Promise<TransactionSegWit> {
    this.validate(transaction, inputOptions, option)
    return await SegWitSigner.sign(transaction, inputOptions, option)
  },

  validate (transaction: Transaction, inputOptions: SignInputOption[], option: SignOption) {
    const { version = true, lockTime = true } = (option.validate !== undefined) ? option.validate : {}

    if (transaction.vin.length === 0) {
      throw new Error('vin.length = 0 - attempting to sign transaction without vin is not allowed')
    }

    if (transaction.vin.length !== inputOptions.length) {
      throw new Error('vin.length and inputOptions.length must match')
    }

    if (version && transaction.version !== DeFiTransactionConstants.Version) {
      throw new Error(`option.validate.version = true - trying to sign a txn ${transaction.version} different from ${DeFiTransactionConstants.Version} is not supported`)
    }

    if (lockTime && transaction.lockTime !== 0) {
      throw new Error(`option.validate.lockTime = true - lockTime: ${transaction.lockTime} must be zero`)
    }
  }
}
