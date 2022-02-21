import { OP_DEFI_TX, OPCode, DfTx } from '@defichain/jellyfish-transaction'
import { ApiClient, blockchain as defid } from '@defichain/jellyfish-api-core'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { SmartBuffer } from 'smart-buffer'
import { DfTxAddressParser } from './dftx/_abstract'
import { RawTransaction } from '@defichain/jellyfish-api-core/dist/category/rawtx'
import { NetworkName } from '@defichain/jellyfish-network'
import { AccountToUtxosParser } from './dftx/accountToUtxos'
import { ActiveAddress } from './ActiveAddress'
import { UtxoAddressParser } from './utxo'

export class AddressParser {
  private readonly dftxs: Array<DfTxAddressParser<any>>
  readonly utxo: UtxoAddressParser

  constructor (
    private readonly apiClient: ApiClient,
    private readonly network: NetworkName
  ) {
    this.dftxs = [
      new AccountToUtxosParser(network)
      // TODO(@ivan-zynesis): add ALL
    ]
    this.utxo = new UtxoAddressParser(apiClient)
  }

  async parse (txn: RawTransaction): Promise<ActiveAddress[]> {
    const result: ActiveAddress[] = []

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
            result.push(...(await parser.extract(dftx.data)))
          }
        }
      }
    }

    return result
  }

  // TBC: one txn can only have ONE DfTx
  // we need absolute certainty to make assumption vins/vouts are servicing this DfTx (process entire txn as a blob)
  private parseDfTx (vout: defid.Vout): DfTx<any> {
    const stack: OPCode[] = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex')))
    if (stack[1].type !== 'OP_DEFI_TX') {
      throw new Error(`Vout is not DfTx: ${vout.scriptPubKey.hex}`)
    }
    return (stack[1] as OP_DEFI_TX).tx
  }

  static checkCategory (txn: RawTransaction): 'dftx' | 'utxo' {
    // TBC: perhaps should be more precise, check only txn.vout[0]
    for (const vout of txn.vout) {
      if (vout.scriptPubKey.asm.startsWith('OP_RETURN 44665478')) {
        return 'dftx'
      }
    }
    return 'utxo'
  }
}
