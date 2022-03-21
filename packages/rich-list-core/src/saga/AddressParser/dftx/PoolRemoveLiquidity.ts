import { fromScript } from '@defichain/jellyfish-address'
import { CPoolRemoveLiquidity, DfTx, PoolRemoveLiquidity } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class PoolRemoveLiquidityParser extends DfTxAddressParser<PoolRemoveLiquidity> {
  OP_CODE: number = CPoolRemoveLiquidity.OP_CODE

  extract (poolRemoveLiquidity: DfTx<PoolRemoveLiquidity>): string[] {
    const shareAddress = fromScript(poolRemoveLiquidity.data.script, this.network)?.address as string

    return [shareAddress]
  }
}
