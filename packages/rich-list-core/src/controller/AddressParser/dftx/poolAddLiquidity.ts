import { fromScript } from '@defichain/jellyfish-address'
import { CPoolAddLiquidity, DfTx, PoolAddLiquidity } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class PoolAddLiquidityParser extends DfTxAddressParser<PoolAddLiquidity> {
  OP_CODE: number = CPoolAddLiquidity.OP_CODE

  extract (dfTx: DfTx<PoolAddLiquidity>): string[] {
    const fromAddresses = dfTx.data.from
      .map((toScriptBal) => fromScript(toScriptBal.script, this.network)?.address as string)
    const shareAddress = fromScript(dfTx.data.shareAddress, this.network)?.address as string

    return [...fromAddresses, shareAddress]
  }
}
