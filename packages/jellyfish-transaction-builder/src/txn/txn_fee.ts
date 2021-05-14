import { BigNumber } from 'bignumber.js'
import {
  OP_PUSHDATA,
  Script,
  Transaction,
  Vin,
  Vout,
  Witness
} from '@defichain/jellyfish-transaction'
import { byteLength } from '@defichain/jellyfish-transaction/dist/buffer/buffer_varuint'

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
    { hex: '000000000000000000000000000000000000000000000000000000000000000000000000000000' }
  ]
}

/**
 * TODO(jellyfish): consider refactoring this implementation
 *
 * @param {BigNumber} amount that is considered dust if it's too little
 * @return {boolean}
 */
export function isDustAmount (amount: BigNumber): boolean {
  return amount.lt(DUST_AMOUNT)
}

/**
 * Calculate fee of a transaction where inputs are all P2WPKH.
 *
 * @param {BigNumber} feeRate
 * @param {Transaction} transaction
 * @return {BigNumber} fee amount to use for transaction with provided fee rate
 */
export function calculateFeeP2WPKH (feeRate: BigNumber, transaction: Transaction): BigNumber {
  const witness = transaction.vin.map(_ => P2WPKH_WITNESS_EXAMPLE)
  const size = calculateVirtual(transaction, witness)
  return feeRate.multipliedBy(size)
}

/**
 * @param {BigNumber} feeRate
 * @param {Transaction} transaction
 * @param {Witness} witness of the transaction, separated to allow unsigned calculation
 * @return {BigNumber} fee amount to use for transaction with provided fee rate
 */
export function calculateFee (feeRate: BigNumber, transaction: Transaction, witness: Witness[]): BigNumber {
  const size = calculateVirtual(transaction, witness)
  return feeRate.multipliedBy(size)
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
  const base = calculateBase(transaction)
  const total = calculateTotal(transaction, witness)
  return base * 3 + total
}

function calculateBase (transaction: Transaction): number {
  return (
    4 + // version
    calculateVin(transaction.vin) +
    calculateVout(transaction.vout) +
    4 // locktime
  )
}

function calculateTotal (transaction: Transaction, witness: Witness[]): number {
  return (
    4 + // version
    1 + // marker
    1 + // flag
    calculateVin(transaction.vin) +
    calculateVout(transaction.vout) +
    calculateWitness(witness) +
    4 // locktime
  )
}

function calculateVin (vin: Vin[]): number {
  return (
    byteLength(vin.length) +
    vin.reduce((sum, input) => {
      return sum + 40 + calculateScript(input.script)
    }, 0)
  )
}

function calculateVout (vout: Vout[]): number {
  return (
    byteLength(vout.length) +
    vout.reduce((sum, output) => {
      return sum +
        8 + // value
        calculateScript(output.script) +
        byteLength(output.tokenId)
    }, 0)
  )
}

function calculateWitness (witness: Witness[]): number {
  return witness.reduce((sum, witness) => {
    return (
      byteLength(witness.scripts.length) +
      witness.scripts.reduce((sum, script) => {
        const length = script.hex.length / 2
        return (
          byteLength(length) +
          length
        )
      }, 0)
    )
  }, 0)
}

function calculateScript (script: Script): number {
  const length = script.stack.reduce((sum, code) => {
    if (code instanceof OP_PUSHDATA) {
      return sum + code.asBuffer().length
    }
    return sum + 1
  }, 0)

  return byteLength(length) + length
}
