import { RawTransaction } from '@defichain/jellyfish-api-core/dist/category/rawtx'
import { BigNumber } from '@defichain/jellyfish-json'
import {
  CreateMasternode,
  DeFiTransactionConstants,
  OP_CODES,
  ResignMasternode,
  Script,
  Transaction,
  TransactionSegWit,
  UpdateMasternode,
  Vin,
  Vout
} from '@defichain/jellyfish-transaction'
import { Prevout } from '../provider'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderMasternode extends P2WPKHTxnBuilder {
  /**
   * Build create masternode transaction
   *
   * @param {CreateMasternode} createMasternode transaction to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @return {Promise<TransactionSegWit>}
   */
  async create (createMasternode: CreateMasternode, changeScript: Script): Promise<TransactionSegWit> {
    const creationFee = this.network.name === 'regtest' ? new BigNumber('1') : new BigNumber('10')
    // NOTE(canonbrother): adding a force default timelock handling here for better ux as from now on, timelock is mandatory
    // https://github.com/DeFiCh/ain/blob/ff53dcee23db2ffe0da9b147a0a53956f4e7ee31/src/masternodes/mn_checks.h#L159
    createMasternode.timelock = createMasternode.timelock ?? 0x0000
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE(createMasternode),
      changeScript,
      creationFee
    )
  }

  /**
   * Build resign masternode transaction
   *
   * @param {ResignMasternode} resignMasternode transaction to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @return {Promise<TransactionSegWit>}
   */
  async resign (resignMasternode: ResignMasternode, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_RESIGN_MASTER_NODE(resignMasternode),
      changeScript
    )
  }

  /**
   * Build update masternode transaction
   *
   * @param {UpdateMasternode} updateMasternode transaction to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @param {Object} [collateralInfo] needed when updating owner address
   * @param {RawTransaction} collateralInfo.rawCollateralTx to get relevant data needed for collateral vin and vout
   * @param {Script} collateralInfo.newOwnerScript for new owner address
   * @return {Promise<TransactionSegWit>}
   */
  async update (
    updateMasternode: UpdateMasternode,
    changeScript: Script,
    collateralInfo?: {
      rawCollateralTx: RawTransaction
      newOwnerScript: Script
    }
  ): Promise<TransactionSegWit> {
    const minFee = new BigNumber(0.001)
    const { prevouts, vin, total } = await this.collectPrevouts(minFee)

    const deFiOut: Vout = {
      value: new BigNumber(0),
      script: {
        stack: [
          OP_CODES.OP_RETURN,
          OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode)
        ]
      },
      tokenId: 0x00
    }

    const change: Vout = {
      value: total,
      script: changeScript,
      tokenId: 0x00
    }

    const mergedVin = [...vin]
    const mergedVout = [deFiOut, change]
    const mergedPrevouts = [...prevouts]

    if (collateralInfo !== null && collateralInfo !== undefined) {
      const { rawCollateralTx, newOwnerScript } = collateralInfo
      const { txid } = rawCollateralTx

      const collateralPrevout: Prevout = {
        txid: txid,
        vout: 1,
        script: changeScript,
        value: new BigNumber(rawCollateralTx.vout[1].value),
        tokenId: rawCollateralTx.vout[1].tokenId
      }
      const collateralVout: Vout = {
        script: newOwnerScript,
        value: new BigNumber(rawCollateralTx.vout[1].value),
        tokenId: rawCollateralTx.vout[1].tokenId
      }
      const collateralVin: Vin = {
        txid: txid,
        index: 1,
        script: { stack: [] },
        sequence: 0xffffffff
      }

      mergedVin.push(collateralVin)
      mergedVout.splice(1, 0, collateralVout)
      mergedPrevouts.push(collateralPrevout)
    }

    const txn: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: mergedVin,
      vout: mergedVout,
      lockTime: 0x00000000
    }

    const fee = await this.calculateFee(txn)
    change.value = total.minus(fee)

    return await this.sign(txn, mergedPrevouts)
  }
}
