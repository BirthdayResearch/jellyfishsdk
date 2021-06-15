import {
  DeFiTransactionConstants, OP_CODES,
  Script,
  Transaction,
  TransactionSegWit,
  Vin, Vout, OP_DEFI_TX
} from '@defichain/jellyfish-transaction'
import { TransactionSigner, SignInputOption } from '@defichain/jellyfish-transaction-signature'
import { BigNumber } from 'bignumber.js'
import { EllipticPairProvider, FeeRateProvider, Prevout, PrevoutProvider } from '../provider'
import { calculateFeeP2WPKH } from './txn_fee'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'

const MAX_FEE_RATE = new BigNumber('0.00100000')

/**
 * Transaction builder for P2WPKH inputs.
 */
export abstract class P2WPKHTxnBuilder {
  constructor (
    public readonly feeProvider: FeeRateProvider,
    public readonly prevoutProvider: PrevoutProvider,
    public readonly ellipticPairProvider: EllipticPairProvider
  ) {
  }

  /**
   * @return {Promise<Prevouts>}
   */
  protected async allPrevouts (): Promise<Prevouts> {
    const prevouts = await this.prevoutProvider.all()
    if (prevouts.length === 0) {
      throw new TxnBuilderError(TxnBuilderErrorType.NO_PREVOUTS,
        'no prevouts available to create a transaction'
      )
    }
    return joinPrevouts(prevouts)
  }

  /**
   * @param {BigNumber} minBalance to collect, required to form a transaction
   * @return {Promise<Prevouts>}
   */
  protected async collectPrevouts (minBalance: BigNumber): Promise<Prevouts> {
    const prevouts = await this.prevoutProvider.collect(minBalance)
    if (prevouts.length === 0) {
      throw new TxnBuilderError(TxnBuilderErrorType.NO_PREVOUTS,
        'no prevouts available to create a transaction'
      )
    }

    const joined = joinPrevouts(prevouts)
    if (minBalance.gt(joined.total)) {
      throw new TxnBuilderError(TxnBuilderErrorType.MIN_BALANCE_NOT_ENOUGH,
        'not enough balance after combing all prevouts'
      )
    }
    return joined
  }

  /**
   * @param {Transaction} transaction to calculate P2WPKH fee for
   * @return {Promise<BigNumber>} fee for transaction
   */
  protected async calculateFee (transaction: Transaction): Promise<BigNumber> {
    const feeRate = await this.feeProvider.estimate()
    if (MAX_FEE_RATE.lte(feeRate)) {
      throw new TxnBuilderError(TxnBuilderErrorType.OVER_MAX_FEE_RATE,
        `attempting to use a fee rate higher than MAX_FEE_RATE of ${MAX_FEE_RATE.toFixed()} is not allowed`
      )
    }

    if (!feeRate.isFinite()) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_FEE_RATE,
        `fee rate ${feeRate.toString()} is invalid`
      )
    }

    return calculateFeeP2WPKH(feeRate, transaction)
  }

  /**
   * Craft a transaction with OP_DEFI_TX from the output of OP_CODES.OP_DEFI_TX_.
   * This is a helper method for creating custom defi transactions.
   *
   * As DeFi custom transaction will always require small amount of DFI,
   * collectPrevouts() is set to search for at least 0.001 DFI amount of prevout.
   * This will also evidently merge small prevout during the operation.
   *
   * Do not use this if you don't know what you are doing. You might misplace funds.
   *
   * @param {OP_DEFI_TX} opDeFiTx to create
   * @param {Script} changeScript to send unspent to after deducting the fees
   * @param {BigNumber} [outValue=0] for the opDeFiTx, usually always be 0.
   */
  async createDeFiTx (
    opDeFiTx: OP_DEFI_TX,
    changeScript: Script,
    outValue: BigNumber = new BigNumber('0')
  ): Promise<TransactionSegWit> {
    const minFee = outValue.plus(0.001) // see JSDoc above
    const { prevouts, vin, total } = await this.collectPrevouts(minFee)

    const deFiOut: Vout = {
      value: outValue,
      script: {
        stack: [OP_CODES.OP_RETURN, opDeFiTx]
      },
      tokenId: 0x00
    }

    const change: Vout = {
      value: total,
      script: changeScript,
      tokenId: 0x00
    }

    const txn: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: vin,
      vout: [deFiOut, change],
      lockTime: 0x00000000
    }

    const fee = await this.calculateFee(txn)
    change.value = total.minus(outValue).minus(fee)

    return await this.sign(txn, prevouts)
  }

  /**
   * @param {Transaction} transaction to sign
   * @param {Prevout[]} prevouts input to sign
   */
  protected async sign (transaction: Transaction, prevouts: Prevout[]): Promise<TransactionSegWit> {
    const signInputOptions = prevouts.map((prevout: Prevout): SignInputOption => {
      return {
        prevout: prevout,
        ellipticPair: this.ellipticPairProvider.get(prevout)
      }
    })

    try {
      return TransactionSigner.sign(transaction, signInputOptions)
    } catch (err) {
      throw new TxnBuilderError(TxnBuilderErrorType.SIGN_TRANSACTION_ERROR, err.message)
    }
  }
}

/**
 * @param {Prevout[]} prevouts to join
 * @return {Prevouts}
 */
function joinPrevouts (prevouts: Prevout[]): Prevouts {
  const vin = prevouts.map((prevout: Prevout): Vin => {
    return {
      txid: prevout.txid,
      index: prevout.vout,
      script: { stack: [] },
      sequence: 0xffffffff
    }
  })

  const total = prevouts
    .map(out => out.value)
    .reduce((a, b) => a.plus(b), new BigNumber(0))
  return { prevouts, vin, total }
}

/**
 * Collection of Prevout to form a transaction.
 */
interface Prevouts {
  prevouts: Prevout[]
  vin: Vin[]
  total: BigNumber
}
