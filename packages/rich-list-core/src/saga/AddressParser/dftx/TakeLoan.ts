import { fromScript } from '@defichain/jellyfish-address'
import { CTakeLoan, DfTx, TakeLoan } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class TakeLoanParser extends DfTxAddressParser<TakeLoan> {
  OP_CODE: number = CTakeLoan.OP_CODE

  extract (paybackLoan: DfTx<TakeLoan>): string[] {
    const address = fromScript(paybackLoan.data.to, this.network)?.address as string
    return [address]
  }
}
