import { fromScript } from '@defichain/jellyfish-address'
import { CPoolSwap, DfTx, PoolSwap } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class PoolSwapParser extends DfTxAddressParser<PoolSwap> {
  OP_CODE: number = CPoolSwap.OP_CODE

  extract (dfTx: DfTx<PoolSwap>): string[] {
    const fromAddress = fromScript(dfTx.data.fromScript, this.network)?.address as string
    const toAddress = fromScript(dfTx.data.toScript, this.network)?.address as string

    return [fromAddress, toAddress]
  }
}
