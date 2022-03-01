import { OP_DEFI_TX, OPCode, DfTx, toOPCodes } from '@defichain/jellyfish-transaction'
import { ApiClient, blockchain as defid } from '@defichain/jellyfish-api-core'
import { SmartBuffer } from 'smart-buffer'
import { DfTxAddressParser } from './dftx/_abstract'
import { NetworkName } from '@defichain/jellyfish-network'
import { AccountToUtxosParser } from './dftx/accountToUtxos'
import { UtxoAddressParser } from './utxo'
import { PoolAddLiquidityParser } from './dftx/poolAddLiquidity'
import { PoolRemoveLiquidityParser } from './dftx/poolRemoveLiquidity'

export class AddressParser {
  private readonly dftxs: Array<DfTxAddressParser<any>>
  private readonly utxo: UtxoAddressParser

  constructor (
    private readonly apiClient: ApiClient,
    private readonly network: NetworkName
  ) {
    this.dftxs = [
      new AccountToUtxosParser(network),
      new PoolAddLiquidityParser(network),
      new PoolRemoveLiquidityParser(network)
      // TODO(@ivan-zynesis): add ALL
    ]
    this.utxo = new UtxoAddressParser(apiClient)
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
            result.push(...(await parser.extract(dftx)))
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
