import {
  DeFiTransactionConstants, OP_CODES,
  Script,
  SignInputOption,
  Transaction,
  TransactionSegWit,
  TransactionSigner, Vin, Vout
} from '@defichain/jellyfish-transaction'
import { BigNumber } from 'bignumber.js'
import { EllipticPairProvider, FeeRateProvider, Prevout, PrevoutProvider } from '../provider'
import { calculateFeeP2WPKH } from './txn_fee'
import { OP_DEFI_TX } from '@defichain/jellyfish-transaction/dist/script/defi'

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
    return joinPrevouts(prevouts)
  }

  /**
   * @param {BigNumber} amount to collect, required to form a transaction
   * @return {Promise<Prevouts>}
   */
  protected async collectPrevouts (amount: BigNumber): Promise<Prevouts> {
    const feeRate = await this.feeProvider.estimate()
    const prevouts = await this.prevoutProvider.collect(amount, feeRate)
    return joinPrevouts(prevouts)
  }

  /**
   * @param {Transaction} transaction to calculate P2WPKH fee for
   * @return {Promise<BigNumber>} fee for transaction
   */
  protected async calculateFee (transaction: Transaction): Promise<BigNumber> {
    const feeRate = await this.feeProvider.estimate()
    if (MAX_FEE_RATE.lt(feeRate)) {
      throw new Error(`attempting to use a fee rate higher than MAX_FEE_RATE of ${MAX_FEE_RATE.toFixed(10)} is not allowed`)
    }

    return calculateFeeP2WPKH(feeRate, transaction)
  }

  /**
   * Craft a transaction with OP_DEFI_TX from the output of OP_CODES.OP_DEFI_TX_.
   * This is a helper method for creating custom defi transactions.
   *
   * As DeFi custom transaction will always require small amount of DFI,
   * collectPrevouts() is set to search for at least 0.01 DFI amount of prevout.
   * This will also evidently merge small prevout during the operation.
   *
   * @param {OP_DEFI_TX} opDeFiTx to create
   * @param {Script} changeScript to send unspent to after deducting the fees
   * @param {BigNumber} [outValue=0] for the opDeFiTx, usually always be 0.
   */
  protected async createDeFiTx (
    opDeFiTx: OP_DEFI_TX,
    changeScript: Script,
    outValue: BigNumber = new BigNumber('0')
  ): Promise<TransactionSegWit> {
    const minFee = outValue.plus(0.01) // see JSDoc above
    const { prevouts, vin, total } = await this.collectPrevouts(minFee)

    const deFiOut: Vout = {
      value: outValue,
      script: {
        stack: [
          OP_CODES.OP_RETURN,
          opDeFiTx
        ]
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
    change.value = total.minus(fee)

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
    return TransactionSigner.sign(transaction, signInputOptions)
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

  const total = prevouts.map(out => out.value).reduce((a, b) => a.plus(b))
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
