import { BigNumber } from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import {
  CTransaction,
  CTransactionSegWit,
  Transaction, TransactionSegWit,
  Witness
} from '@defichain/jellyfish-transaction'

/**
 * Consider dust if output is < 0.00003000
 * This is not the cleanest way to calculate but it's the easiest.
 * TODO(jellyfish): consider refactoring this implementation
 */
const DUST_AMOUNT = new BigNumber('0.00003000')
// const DUST_RELAY_TX_FEE = new BigNumber('0.00003000')

/**
 * A P2PKH witness example for estimating txn size before signing transaction.
 */
const P2WPKH_WITNESS_EXAMPLE: Witness = {
  scripts: [
    { hex: '3044022000000000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000000001' },
    { hex: '000000000000000000000000000000000000000000000000000000000000000000' }
  ]
}

/**
 * TODO(jellyfish): consider refactoring this implementation
 *
 * @param {BigNumber} amount that is considered dust if it's too little
 * @return {boolean}
 */
export function isDustAmount (amount: BigNumber): boolean {
  return amount.lte(DUST_AMOUNT)
}

/**
 * Calculate fee of a transaction where inputs are all P2WPKH.
 *
 * @param {BigNumber} feeRate in DFI/kb
 * @param {Transaction} transaction
 * @return {BigNumber} fee amount to use for transaction with provided fee rate
 */
export function calculateFeeP2WPKH (feeRate: BigNumber, transaction: Transaction): BigNumber {
  const witness = transaction.vin.map(_ => P2WPKH_WITNESS_EXAMPLE)
  const size = calculateVirtual(transaction, witness)
  return feeRate.multipliedBy(size).dividedBy(1000)
}

/**
 * @param {BigNumber} feeRate in DFI/kb
 * @param {Transaction} transaction
 * @param {Witness} witness of the transaction, separated to allow unsigned calculation
 * @return {BigNumber} fee amount to use for transaction with provided fee rate
 */
export function calculateFee (feeRate: BigNumber, transaction: Transaction, witness: Witness[]): BigNumber {
  const size = calculateVirtual(transaction, witness)
  return feeRate.multipliedBy(size).dividedBy(1000)
}

/**
 * @param {Transaction} transaction
 * @param {Witness} witness of the transaction, separated to allow unsigned calculation
 * @return {number} calculated virtual size of transaction
 */
export function calculateVirtual (transaction: Transaction, witness: Witness[]): number {
  return Math.ceil(calculateWeight(transaction, witness) / 4)
}

/**
 * @param {Transaction} transaction
 * @param {Witness} witness of the transaction, separated to allow unsigned calculation
 * @return {number} calculated weight of transaction
 */
export function calculateWeight (transaction: Transaction, witness: Witness[]): number {
  const base = calculate(transaction)
  const total = calculateWitness({
    version: transaction.version,
    marker: 0x00,
    flag: 0x01,
    vin: transaction.vin,
    vout: transaction.vout,
    lockTime: transaction.lockTime,
    witness: witness
  })
  return base * 3 + total
}

function calculate (transaction: Transaction): number {
  const buffer = new SmartBuffer()
  new CTransaction(transaction).toBuffer(buffer)
  return buffer.length
}

function calculateWitness (transaction: TransactionSegWit): number {
  const buffer = new SmartBuffer()
  new CTransactionSegWit(transaction).toBuffer(buffer)
  return buffer.length
}
