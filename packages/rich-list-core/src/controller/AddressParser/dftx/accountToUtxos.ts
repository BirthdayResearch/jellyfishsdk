import { fromScript } from '@defichain/jellyfish-address'
import { AccountToUtxos, CAccountToUtxos, DfTx } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class AccountToUtxosParser extends DfTxAddressParser<AccountToUtxos> {
  OP_CODE: number = CAccountToUtxos.OP_CODE

  extract (accountToUtxos: DfTx<AccountToUtxos>): string[] {
    const address = fromScript(accountToUtxos.data.from, this.network)?.address as string
    return [address]
  }
}
