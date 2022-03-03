import { fromScript } from '@defichain/jellyfish-address'
import { CPoolAddLiquidity, DfTx, PoolAddLiquidity } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class PoolAddLiquidityParser extends DfTxAddressParser<PoolAddLiquidity> {
  OP_CODE: number = CPoolAddLiquidity.OP_CODE

  extract (poolAddLiquidity: DfTx<PoolAddLiquidity>): string[] {
    const fromAddresses = poolAddLiquidity.data.from
      .map((toScriptBal) => fromScript(toScriptBal.script, this.network)?.address as string)
    const shareAddress = fromScript(poolAddLiquidity.data.shareAddress, this.network)?.address as string

    return [...fromAddresses, shareAddress]
  }
}
