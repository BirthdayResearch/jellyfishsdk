import { OP_DEFI_TX, OPCode, DfTx, toOPCodes } from '@defichain/jellyfish-transaction'
import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { SmartBuffer } from 'smart-buffer'
import { DfTxAddressParser } from './dftx/_abstract'
import { NetworkName } from '@defichain/jellyfish-network'
import { AccountToUtxosParser } from './dftx/AccountToUtxos'
import { AccountToAccountParser } from './dftx/accountToAccount'
import { AnyAccountToAccountParser } from './dftx/AnyAccountToAccount'
import { UtxosToAccountParser } from './dftx/UtxosToAccount'
import { PoolAddLiquidityParser } from './dftx/PoolAddLiquidity'
import { PoolRemoveLiquidityParser } from './dftx/PoolRemoveLiquidity'
import { PoolSwapParser } from './dftx/PoolSwap'
import { CompositeSwapParser } from './dftx/CompositeSwap'
import { WithdrawFromVaultParser } from './dftx/WithdrawFromVault'
import { DepositToVaultParser } from './dftx/DepositToVault'
import { TakeLoanParser } from './dftx/TakeLoan'
import { UtxoAddressParser } from './UtxoAddressParser'
import { WhaleRpcClient } from '@defichain/whale-api-client'

export class AddressParser {
  constructor (
    private readonly rpcClient: WhaleRpcClient,
    private readonly network: NetworkName,
    private readonly dftxs: Array<DfTxAddressParser<any>> = [
      new UtxosToAccountParser(network),
      new AccountToUtxosParser(network),
      new AccountToAccountParser(network),
      new AnyAccountToAccountParser(network),
      new PoolAddLiquidityParser(network),
      new PoolRemoveLiquidityParser(network),
      new PoolSwapParser(network),
      new CompositeSwapParser(network),
      new TakeLoanParser(network),
      new WithdrawFromVaultParser(network),
      new DepositToVaultParser(network)
      // TODO(@ivan-zynesis): add ALL
    ],
    private readonly utxo: UtxoAddressParser = new UtxoAddressParser(rpcClient)
  ) {
  }

  async parse (txn: defid.Transaction): Promise<string[]> {
    const result: string[] = []

    for (const vin of txn.vin) {
      result.push(...(await this.utxo.extractFromVin(vin)))
    }

    for (const vout of txn.vout) {
      if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 44665478')) {
        // vout is utxo
        result.push(...(await this.utxo.extractFromVout(vout)))
      } else {
        // vout is dftx
        const dftx = this.parseDfTx(vout) // assuming single DfTx per txid
        for (let i = 0; i < this.dftxs.length; i++) {
          const parser = this.dftxs[i]
          if (parser.OP_CODE === dftx.type) {
            result.push(...(parser.extract(dftx)))
          }
          // with assumption, not implemented DfTx parser do not affect token balance
        }
      }
    }

    return result
  }

  private parseDfTx (vout: defid.Vout): DfTx<any> {
    const stack: OPCode[] = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex')))
    if (stack[1].type !== 'OP_DEFI_TX') {
      throw new Error(`Vout is not DfTx: ${vout.scriptPubKey.hex}`)
    }
    return (stack[1] as OP_DEFI_TX).tx
  }
}
