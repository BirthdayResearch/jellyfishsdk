import { fromScript } from '@defichain/jellyfish-address'
import { CPaybackLoan, DfTx, PaybackLoan } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class PaybackLoanParser extends DfTxAddressParser<PaybackLoan> {
  OP_CODE: number = CPaybackLoan.OP_CODE

  extract (paybackLoan: DfTx<PaybackLoan>): string[] {
    const address = fromScript(paybackLoan.data.from, this.network)?.address as string
    return [address]
  }
}
