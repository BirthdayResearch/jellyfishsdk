import BigNumber from 'bignumber.js'
import { P2WPKHTxnBuilder } from './txn_builder'
import {
  DeFiTransactionConstants,
  Script,
  Transaction,
  TransactionSegWit,
  Vout
} from '@defichain/jellyfish-transaction'

export class TxnBuilderUtxo extends P2WPKHTxnBuilder {
  /**
   * Send all UTXO provided by prevoutProvider.all() to script.
   *
   * @param {Script} toScript to send output to
   */
  async sendAll (toScript: Script): Promise<TransactionSegWit> {
    const { prevouts, vin, total } = await this.allPrevouts()

    const to: Vout = {
      value: total,
      script: toScript,
      tokenId: 0x00
    }

    const txn: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: vin,
      vout: [to],
      lockTime: 0x00000000
    }

    const fee = await this.calculateFee(txn)
    to.value = total.minus(fee)

    return await this.sign(txn, prevouts)
  }

  /**
   * Send a specific amount of UTXO provided by prevoutProvider.collect(amount, fee) to script.
   *
   * @param {BigNumber} amount of UTXO to send to script
   * @param {Script} toScript to send UTXO to
   * @param {Script} changeScript to send unspent to after deducting the fees
   */
  async send (amount: BigNumber, toScript: Script, changeScript: Script): Promise<TransactionSegWit> {
    const minAmount = amount.plus(0.01)
    const { prevouts, vin, total } = await this.collectPrevouts(minAmount)
    const changeAmount = total.minus(amount)

    const to: Vout = {
      value: amount,
      script: toScript,
      tokenId: 0x00
    }

    const change: Vout = {
      value: changeAmount,
      script: changeScript,
      tokenId: 0x00
    }

    const txn: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: vin,
      vout: [to, change],
      lockTime: 0x00000000
    }
    const fee = await this.calculateFee(txn)
    change.value = changeAmount.minus(fee)

    return await this.sign(txn, prevouts)
  }
}
