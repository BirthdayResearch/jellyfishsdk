import { fromScript } from '@defichain/jellyfish-address'
import { CPoolSwap, DfTx, PoolSwap } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class PoolSwapParser extends DfTxAddressParser<PoolSwap> {
  OP_CODE: number = CPoolSwap.OP_CODE

  extract (poolSwap: DfTx<PoolSwap>): string[] {
    const fromAddress = fromScript(poolSwap.data.fromScript, this.network)?.address as string
    const toAddress = fromScript(poolSwap.data.toScript, this.network)?.address as string

    return [fromAddress, toAddress]
  }
}
