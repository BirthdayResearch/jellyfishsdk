import { fromScript } from '@defichain/jellyfish-address'
import { CCompositeSwap, CompositeSwap, DfTx } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class CompositeSwapParser extends DfTxAddressParser<CompositeSwap> {
  OP_CODE: number = CCompositeSwap.OP_CODE

  extract (compositeSwap: DfTx<CompositeSwap>): string[] {
    const poolSwapDfTx = compositeSwap.data.poolSwap
    const fromAddress = fromScript(poolSwapDfTx.fromScript, this.network)?.address as string
    const toAddress = fromScript(poolSwapDfTx.toScript, this.network)?.address as string

    return [fromAddress, toAddress]
  }
}
