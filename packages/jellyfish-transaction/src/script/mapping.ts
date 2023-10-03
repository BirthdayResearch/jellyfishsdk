import { SmartBuffer } from 'smart-buffer'
import { readCompactSize, writeCompactSize } from '@defichain/jellyfish-buffer'
import { toBuffer, toOPCodes } from './_buffer'
import { OPCode, StaticCode } from './opcode'
import { OP_PUSHDATA } from './data'
import { OP_DEFI_TX } from './dftx'
import { CDfTx, DfTx } from './dftx/dftx'
import * as constants from './constants'
import * as control from './control'
import * as stack from './stack'
import * as splice from './splice'
import * as bitwise from './bitwise'
import * as arithmetic from './arithmetic'
import * as crypto from './crypto'
import * as expansion from './expansion'
import * as invalid from './invalid'
import {
  CPoolAddLiquidity,
  CPoolCreatePair,
  CPoolRemoveLiquidity,
  CPoolSwap,
  CCompositeSwap,
  CPoolUpdatePair,
  PoolAddLiquidity,
  PoolCreatePair,
  PoolRemoveLiquidity,
  PoolSwap,
  CompositeSwap,
  PoolUpdatePair
} from './dftx/dftx_pool'
import {
  CTokenBurn,
  CTokenCreate,
  CTokenMint,
  CTokenUpdate,
  CTokenUpdateAny,
  TokenBurn,
  TokenCreate,
  TokenMint,
  TokenUpdate,
  TokenUpdateAny
} from './dftx/dftx_token'
import {
  AccountToAccount,
  AccountToUtxos,
  AnyAccountToAccount,
  UtxosToAccount,
  SetFutureSwap,
  CAccountToAccount,
  CTransferDomain,
  TransferDomain,
  CAccountToUtxos,
  CAnyAccountToAccount,
  CUtxosToAccount,
  CSetFutureSwap
} from './dftx/dftx_account'
import {
  AppointOracle,
  CAppointOracle,
  CRemoveOracle,
  CSetOracleData,
  CUpdateOracle,
  RemoveOracle,
  SetOracleData,
  UpdateOracle
} from './dftx/dftx_oracles'
import {
  CSetLoanScheme,
  SetLoanScheme,
  CDestroyLoanScheme,
  DestroyLoanScheme,
  CSetDefaultLoanScheme,
  SetDefaultLoanScheme,
  CSetCollateralToken,
  SetCollateralToken,
  CSetLoanToken,
  SetLoanToken,
  CUpdateLoanToken,
  UpdateLoanToken,
  TakeLoan,
  CTakeLoan,
  CPaybackLoan,
  PaybackLoan,
  CPaybackLoanV2,
  PaybackLoanV2
} from './dftx/dftx_loans'
import {
  CCreateVault,
  CreateVault,
  CUpdateVault,
  UpdateVault,
  CDepositToVault,
  DepositToVault,
  CWithdrawFromVault,
  WithdrawFromVault,
  CCloseVault,
  CloseVault,
  CPlaceAuctionBid,
  PlaceAuctionBid
} from './dftx/dftx_vault'
import { CAutoAuthPrep } from './dftx/dftx_misc'
import {
  CSetGovernance,
  SetGovernance,
  CSetGovernanceHeight,
  SetGovernanceHeight,
  CCreateCfp,
  CCreateVoc,
  CreateCfp,
  CreateVoc,
  CVote,
  Vote
} from './dftx/dftx_governance'
import {
  CICXCreateOrder,
  ICXCreateOrder,
  CICXMakeOffer,
  ICXMakeOffer,
  CICXCloseOrder,
  ICXCloseOrder,
  CICXCloseOffer,
  ICXCloseOffer,
  CICXSubmitDFCHTLC,
  ICXSubmitDFCHTLC,
  CICXSubmitEXTHTLC,
  ICXSubmitEXTHTLC,
  CICXClaimDFCHTLC,
  ICXClaimDFCHTLC
} from './dftx/dftx_icxorderbook'
import {
  CCreateMasternode,
  CreateMasternode,
  CResignMasternode,
  ResignMasternode,
  CUpdateMasternode,
  UpdateMasternode
} from './dftx/dftx_masternode'
import { CEvmTx, EvmTx } from './dftx/dftx_evmtx'

/**
 * @param num to map as OPCode, 1 byte long
 */
export function numAsOPCode (num: number): StaticCode {
  if (num > 0xff) {
    throw new Error('OPCode should be 1 byte.')
  }

  const opCode = HEX_MAPPING[num]
  if (opCode !== undefined) {
    return opCode
  }

  return new OP_UNMAPPED(num)
}

/**
 * Unmapped OPCode are codes that don't yet have a class for it yet.
 */
export class OP_UNMAPPED extends StaticCode {
  constructor (code: number) {
    super(code, `OP_UNMAPPED_CODE_${code.toString()}`)
  }
}

/**
 * All static OP_CODES & DEFI Custom Tx scripting
 * @see https://github.com/DeFiCh/ain/blob/master/src/script/script.h
 */
export const OP_CODES = {
  /**
   * Read SmartBuffer and create OPCode[] stack.
   *
   * Using P2WPKH redeem script as an example.
   *
   * Input Example: 1600140e7c0ab18b305bc987a266dc06de26fcfab4b56a
   *   0x16 (VarUInt)
   *   0x00 (OP_0)
   *   6ab5b4fafc26de06dc66a287c95b308bb10a7c0e (formatted as big endian)
   *
   * Output Example:
   *   OP_0
   *   OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>
   *
   * @param {SmartBuffer} buffer to read from
   * @return {OPCode[]} read from buffer to OPCode
   */
  fromBuffer (buffer: SmartBuffer) {
    const length = readCompactSize(buffer)
    if (length === 0) {
      return []
    }

    return toOPCodes(SmartBuffer.fromBuffer(buffer.readBuffer(length)))
  },
  /**
   * Converts OPCode[] and write it into SmartBuffer.
   *
   * Using P2PKH redeem script as an example.
   *
   * Input Example:
   *   OP_DUP
   *   OP_HASH160
   *   OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>
   *   OP_EQUALVERIFY
   *   OP_CHECKSIG
   *
   * Output Example: 1976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac
   *   0x19 (VarUInt)
   *   0x76 (OP_DUP)
   *   0xa9 (OP_HASH160)
   *   5981aa7f16f0e20cd5b2216abe4d7eeedb42de3b (formatted as big endian)
   *   0x88 (OP_EQUALVERIFY)
   *   0xac (OP_CHECKSIG)
   *
   * @param {OPCode[]} stack to convert into raw buffer
   * @param {SmartBuffer} buffer to write to
   */
  toBuffer (stack: OPCode[], buffer: SmartBuffer) {
    const buffs = toBuffer(stack)

    // Write the len of buffer in bytes and then all the buffer
    writeCompactSize(buffs.length, buffer)
    buffer.writeBuffer(buffs)
  },
  OP_DEFI_TX: (dftx: DfTx<any>): OP_DEFI_TX => {
    return new OP_DEFI_TX(dftx)
  },
  OP_DEFI_TX_POOL_SWAP: (poolSwap: PoolSwap): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CPoolSwap.OP_CODE,
      name: CPoolSwap.OP_NAME,
      data: poolSwap
    })
  },
  OP_DEFI_TX_COMPOSITE_SWAP: (compositeSwap: CompositeSwap): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CCompositeSwap.OP_CODE,
      name: CCompositeSwap.OP_NAME,
      data: compositeSwap
    })
  },
  OP_DEFI_TX_POOL_ADD_LIQUIDITY: (poolAddLiquidity: PoolAddLiquidity): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CPoolAddLiquidity.OP_CODE,
      name: CPoolAddLiquidity.OP_NAME,
      data: poolAddLiquidity
    })
  },
  OP_DEFI_TX_POOL_REMOVE_LIQUIDITY: (poolRemoveLiquidity: PoolRemoveLiquidity): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CPoolRemoveLiquidity.OP_CODE,
      name: CPoolRemoveLiquidity.OP_NAME,
      data: poolRemoveLiquidity
    })
  },
  OP_DEFI_TX_POOL_CREATE_PAIR: (poolCreatePair: PoolCreatePair): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CPoolCreatePair.OP_CODE,
      name: CPoolCreatePair.OP_NAME,
      data: poolCreatePair
    })
  },
  OP_DEFI_TX_POOL_UPDATE_PAIR: (poolCreatePair: PoolUpdatePair): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CPoolUpdatePair.OP_CODE,
      name: CPoolUpdatePair.OP_NAME,
      data: poolCreatePair
    })
  },
  OP_DEFI_TX_TOKEN_MINT: (tokenMint: TokenMint): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CTokenMint.OP_CODE,
      name: CTokenMint.OP_NAME,
      data: tokenMint
    })
  },
  OP_DEFI_TX_TOKEN_CREATE: (tokenCreate: TokenCreate): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CTokenCreate.OP_CODE,
      name: CTokenCreate.OP_NAME,
      data: tokenCreate
    })
  },
  OP_DEFI_TX_TOKEN_UPDATE: (tokenUpdate: TokenUpdate): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CTokenUpdate.OP_CODE,
      name: CTokenUpdate.OP_NAME,
      data: tokenUpdate
    })
  },
  OP_DEFI_TX_TOKEN_UPDATE_ANY: (tokenUpdateAny: TokenUpdateAny): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CTokenUpdateAny.OP_CODE,
      name: CTokenUpdateAny.OP_NAME,
      data: tokenUpdateAny
    })
  },
  OP_DEFI_TX_TOKEN_BURN: (tokenBurn: TokenBurn): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CTokenBurn.OP_CODE,
      name: CTokenBurn.OP_NAME,
      data: tokenBurn
    })
  },
  OP_DEFI_TX_UTXOS_TO_ACCOUNT: (utxosToAccount: UtxosToAccount): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CUtxosToAccount.OP_CODE,
      name: CUtxosToAccount.OP_NAME,
      data: utxosToAccount
    })
  },
  OP_DEFI_TX_ACCOUNT_TO_UTXOS: (accountToUtxos: AccountToUtxos): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAccountToUtxos.OP_CODE,
      name: CAccountToUtxos.OP_NAME,
      data: accountToUtxos
    })
  },
  OP_DEFI_TX_ACCOUNT_TO_ACCOUNT: (accountToAccount: AccountToAccount): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAccountToAccount.OP_CODE,
      name: CAccountToAccount.OP_NAME,
      data: accountToAccount
    })
  },
  OP_DEFI_TX_TRANSFER_DOMAIN: (transferDomain: TransferDomain): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CTransferDomain.OP_CODE,
      name: CTransferDomain.OP_NAME,
      data: transferDomain
    })
  },
  OP_DEFI_TX_ANY_ACCOUNT_TO_ACCOUNT: (anyAccountToAccount: AnyAccountToAccount): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAnyAccountToAccount.OP_CODE,
      name: CAnyAccountToAccount.OP_NAME,
      data: anyAccountToAccount
    })
  },
  OP_DEFI_TX_FUTURE_SWAP: (futureSwap: SetFutureSwap): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CSetFutureSwap.OP_CODE,
      name: CSetFutureSwap.OP_NAME,
      data: futureSwap
    })
  },
  OP_DEFI_TX_APPOINT_ORACLE: (appointOracle: AppointOracle): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAppointOracle.OP_CODE,
      name: CAppointOracle.OP_NAME,
      data: appointOracle
    })
  },
  OP_DEFI_TX_REMOVE_ORACLE: (removeOracle: RemoveOracle): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CRemoveOracle.OP_CODE,
      name: CRemoveOracle.OP_NAME,
      data: removeOracle
    })
  },
  OP_DEFI_TX_UPDATE_ORACLE: (updateOracle: UpdateOracle): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CUpdateOracle.OP_CODE,
      name: CUpdateOracle.OP_NAME,
      data: updateOracle
    })
  },
  OP_DEFI_TX_SET_ORACLE_DATA: (setOracleData: SetOracleData): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CSetOracleData.OP_CODE,
      name: CSetOracleData.OP_NAME,
      data: setOracleData
    })
  },
  OP_DEFI_TX_AUTO_AUTH_PREP: () => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAutoAuthPrep.OP_CODE,
      name: CAutoAuthPrep.OP_NAME,
      data: null
    })
  },
  OP_DEFI_TX_CREATE_MASTER_NODE: (createMasterNode: CreateMasternode): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CCreateMasternode.OP_CODE,
      name: CCreateMasternode.OP_NAME,
      data: createMasterNode
    })
  },
  OP_DEFI_TX_RESIGN_MASTER_NODE: (resignMasternode: ResignMasternode): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CResignMasternode.OP_CODE,
      name: CResignMasternode.OP_NAME,
      data: resignMasternode
    })
  },
  OP_DEFI_TX_UPDATE_MASTER_NODE: (updateMasternode: UpdateMasternode): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CUpdateMasternode.OP_CODE,
      name: CUpdateMasternode.OP_NAME,
      data: updateMasternode
    })
  },
  OP_DEFI_TX_SET_GOVERNANCE: (setGovernance: SetGovernance) => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CSetGovernance.OP_CODE,
      name: CSetGovernance.OP_NAME,
      data: setGovernance
    })
  },
  OP_DEFI_TX_SET_GOVERNANCE_HEIGHT: (setGovernanceHeight: SetGovernanceHeight) => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CSetGovernanceHeight.OP_CODE,
      name: CSetGovernanceHeight.OP_NAME,
      data: setGovernanceHeight
    })
  },
  OP_DEFI_TX_ICX_CREATE_ORDER: (createOrder: ICXCreateOrder) => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CICXCreateOrder.OP_CODE,
      name: CICXCreateOrder.OP_NAME,
      data: createOrder
    })
  },
  OP_DEFI_TX_ICX_MAKE_OFFER: (makeOffer: ICXMakeOffer) => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CICXMakeOffer.OP_CODE,
      name: CICXMakeOffer.OP_NAME,
      data: makeOffer
    })
  },
  OP_DEFI_TX_ICX_CLOSE_ORDER: (closeOrder: ICXCloseOrder) => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CICXCloseOrder.OP_CODE,
      name: CICXCloseOrder.OP_NAME,
      data: closeOrder
    })
  },
  OP_DEFI_TX_ICX_CLOSE_OFFER: (closeOffer: ICXCloseOffer) => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CICXCloseOffer.OP_CODE,
      name: CICXCloseOffer.OP_NAME,
      data: closeOffer
    })
  },
  OP_DEFI_TX_CREATE_CFP: (createCfp: CreateCfp) => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CCreateCfp.OP_CODE,
      name: CCreateCfp.OP_NAME,
      data: createCfp
    })
  },
  OP_DEFI_TX_CREATE_VOC: (createVoc: CreateVoc) => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CCreateVoc.OP_CODE,
      name: CCreateVoc.OP_NAME,
      data: createVoc
    })
  },
  OP_DEFI_TX_VOTE: (vote: Vote) => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CVote.OP_CODE,
      name: CVote.OP_NAME,
      data: vote
    })
  },
  OP_DEFI_TX_ICX_SUBMIT_DFC_HTLC: (icxSubmitDFCHTLC: ICXSubmitDFCHTLC): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CICXSubmitDFCHTLC.OP_CODE,
      name: CICXSubmitDFCHTLC.OP_NAME,
      data: icxSubmitDFCHTLC
    })
  },
  OP_DEFI_TX_ICX_SUBMIT_EXT_HTLC: (icxSubmitEXTHTLC: ICXSubmitEXTHTLC): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CICXSubmitEXTHTLC.OP_CODE,
      name: CICXSubmitEXTHTLC.OP_NAME,
      data: icxSubmitEXTHTLC
    })
  },
  OP_DEFI_TX_ICX_CLAIM_DFC_HTLC: (icxClaimDFCHTLC: ICXClaimDFCHTLC): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CICXClaimDFCHTLC.OP_CODE,
      name: CICXClaimDFCHTLC.OP_NAME,
      data: icxClaimDFCHTLC
    })
  },
  OP_DEFI_TX_SET_LOAN_SCHEME: (setLoanScheme: SetLoanScheme): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CSetLoanScheme.OP_CODE,
      name: CSetLoanScheme.OP_NAME,
      data: setLoanScheme
    })
  },
  OP_DEFI_TX_DESTROY_LOAN_SCHEME: (destroyLoanScheme: DestroyLoanScheme): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CDestroyLoanScheme.OP_CODE,
      name: CDestroyLoanScheme.OP_NAME,
      data: destroyLoanScheme
    })
  },
  OP_DEFI_TX_SET_DEFAULT_LOAN_SCHEME: (setDefaultLoanScheme: SetDefaultLoanScheme): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CSetDefaultLoanScheme.OP_CODE,
      name: CSetDefaultLoanScheme.OP_NAME,
      data: setDefaultLoanScheme
    })
  },
  OP_DEFI_TX_SET_COLLATERAL_TOKEN: (setCollateralToken: SetCollateralToken): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CSetCollateralToken.OP_CODE,
      name: CSetCollateralToken.OP_NAME,
      data: setCollateralToken
    })
  },
  OP_DEFI_TX_SET_LOAN_TOKEN: (setLoanToken: SetLoanToken): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CSetLoanToken.OP_CODE,
      name: CSetLoanToken.OP_NAME,
      data: setLoanToken
    })
  },
  OP_DEFI_TX_UPDATE_LOAN_TOKEN: (updateLoanToken: UpdateLoanToken): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CUpdateLoanToken.OP_CODE,
      name: CUpdateLoanToken.OP_NAME,
      data: updateLoanToken
    })
  },
  OP_DEFI_TX_CREATE_VAULT: (createVault: CreateVault): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CCreateVault.OP_CODE,
      name: CCreateVault.OP_NAME,
      data: createVault
    })
  },
  OP_DEFI_TX_UPDATE_VAULT: (updateVault: UpdateVault): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CUpdateVault.OP_CODE,
      name: CUpdateVault.OP_NAME,
      data: updateVault
    })
  },
  OP_DEFI_TX_DEPOSIT_TO_VAULT: (depositToVault: DepositToVault): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CDepositToVault.OP_CODE,
      name: CDepositToVault.OP_NAME,
      data: depositToVault
    })
  },
  OP_DEFI_TX_WITHDRAW_FROM_VAULT: (WithdrawFromVault: WithdrawFromVault): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CWithdrawFromVault.OP_CODE,
      name: CWithdrawFromVault.OP_NAME,
      data: WithdrawFromVault
    })
  },
  OP_DEFI_TX_CLOSE_VAULT: (closeVault: CloseVault): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CCloseVault.OP_CODE,
      name: CCloseVault.OP_NAME,
      data: closeVault
    })
  },
  OP_DEFI_TX_TAKE_LOAN: (takeLoan: TakeLoan): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CTakeLoan.OP_CODE,
      name: CTakeLoan.OP_NAME,
      data: takeLoan
    })
  },
  OP_DEFI_TX_PAYBACK_LOAN: (paybackLoan: PaybackLoan): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CPaybackLoan.OP_CODE,
      name: CPaybackLoan.OP_NAME,
      data: paybackLoan
    })
  },
  OP_DEFI_TX_PAYBACK_LOAN_V2: (paybackLoanV2: PaybackLoanV2): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CPaybackLoanV2.OP_CODE,
      name: CPaybackLoanV2.OP_NAME,
      data: paybackLoanV2
    })
  },
  OP_DEFI_TX_AUCTION_BID: (placeAuctionBid: PlaceAuctionBid): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CPlaceAuctionBid.OP_CODE,
      name: CPlaceAuctionBid.OP_NAME,
      data: placeAuctionBid
    })
  },
  /**
   * EVM TX
   */
  OP_DEFI_TX_EVM_TX: (evmTx: EvmTx): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CEvmTx.OP_CODE,
      name: CEvmTx.OP_NAME,
      data: evmTx
    })
  },
  OP_0: new constants.OP_0(),
  OP_FALSE: new constants.OP_FALSE(),
  /**
   * OP_PUSHDATA1 use OP_PUSHDATA
   * OP_PUSHDATA2 use OP_PUSHDATA
   * OP_PUSHDATA4 use OP_PUSHDATA
   * @param {Buffer} buffer
   * @param {'little' | 'big'} endian order
   */
  OP_PUSHDATA: (buffer: Buffer, endian: 'little' | 'big'): OP_PUSHDATA => {
    return new OP_PUSHDATA(buffer, endian)
  },
  /**
   * @param {Buffer} buffer in little endian
   */
  OP_PUSHDATA_LE: (buffer: Buffer): OP_PUSHDATA => {
    return new OP_PUSHDATA(buffer, 'little')
  },
  /**
   * @param {string} hex in little endian
   */
  OP_PUSHDATA_HEX_LE: (hex: string): OP_PUSHDATA => {
    return new OP_PUSHDATA(Buffer.from(hex, 'hex'), 'little')
  },

  /**
   * @param {string} hex in big endian
   */
  OP_PUSHDATA_HEX_BE: (hex: string): OP_PUSHDATA => {
    return new OP_PUSHDATA(Buffer.from(hex, 'hex'), 'big')
  },

  // TODO: to map everything as class
  //  to be separated into concerns, stack, arithmetic, crypto, etc...

  OP_1NEGATE: new constants.OP_1NEGATE(),
  OP_RESERVED: new constants.OP_RESERVED(),
  OP_1: new constants.OP_1(),
  OP_TRUE: new constants.OP_TRUE(),
  OP_2: new constants.OP_2(),
  OP_3: new constants.OP_3(),
  OP_4: new constants.OP_4(),
  OP_5: new constants.OP_5(),
  OP_6: new constants.OP_6(),
  OP_7: new constants.OP_7(),
  OP_8: new constants.OP_8(),
  OP_9: new constants.OP_9(),
  OP_10: new constants.OP_10(),
  OP_11: new constants.OP_11(),
  OP_12: new constants.OP_12(),
  OP_13: new constants.OP_13(),
  OP_14: new constants.OP_14(),
  OP_15: new constants.OP_15(),
  OP_16: new constants.OP_16(),

  // control
  OP_NOP: new control.OP_NOP(),
  OP_VER: new control.OP_VER(),
  OP_IF: new control.OP_IF(),
  OP_NOTIF: new control.OP_NOTIF(),
  OP_VERIF: new control.OP_VERIF(),
  OP_VERNOTIF: new control.OP_VERNOTIF(),
  OP_ELSE: new control.OP_ELSE(),
  OP_ENDIF: new control.OP_ENDIF(),
  OP_VERIFY: new control.OP_VERIFY(),
  OP_RETURN: new control.OP_RETURN(),

  // stack
  OP_TOALTSTACK: new stack.OP_TOALTSTACK(),
  OP_FROMALTSTACK: new stack.OP_FROMALTSTACK(),
  OP_2DROP: new stack.OP_2DROP(),
  OP_2DUP: new stack.OP_2DUP(),
  OP_3DUP: new stack.OP_3DUP(),
  OP_2OVER: new stack.OP_2OVER(),
  OP_2ROT: new stack.OP_2ROT(),
  OP_2SWAP: new stack.OP_2SWAP(),
  OP_IFDUP: new stack.OP_IFDUP(),
  OP_DEPTH: new stack.OP_DEPTH(),
  OP_DROP: new stack.OP_DROP(),
  OP_DUP: new stack.OP_DUP(),
  OP_NIP: new stack.OP_NIP(),
  OP_OVER: new stack.OP_OVER(),
  OP_PICK: new stack.OP_PICK(),
  OP_ROLL: new stack.OP_ROLL(),
  OP_ROT: new stack.OP_ROT(),
  OP_SWAP: new stack.OP_SWAP(),
  OP_TUCK: new stack.OP_TUCK(),

  // splice
  OP_CAT: new splice.OP_CAT(),
  OP_SUBSTR: new splice.OP_SUBSTR(),
  OP_LEFT: new splice.OP_LEFT(),
  OP_RIGHT: new splice.OP_RIGHT(),
  OP_SIZE: new splice.OP_SIZE(),

  // bitwise
  OP_INVERT: new bitwise.OP_INVERT(),
  OP_AND: new bitwise.OP_AND(),
  OP_OR: new bitwise.OP_OR(),
  OP_XOR: new bitwise.OP_XOR(),
  OP_EQUAL: new bitwise.OP_EQUAL(),
  OP_EQUALVERIFY: new bitwise.OP_EQUALVERIFY(),
  OP_RESERVED1: new bitwise.OP_RESERVED1(),
  OP_RESERVED2: new bitwise.OP_RESERVED2(),

  // numeric
  OP_1ADD: new arithmetic.OP_1ADD(),
  OP_1SUB: new arithmetic.OP_1SUB(),
  OP_2MUL: new arithmetic.OP_2MUL(),
  OP_2DIV: new arithmetic.OP_2DIV(),
  OP_NEGATE: new arithmetic.OP_NEGATE(),
  OP_ABS: new arithmetic.OP_ABS(),
  OP_NOT: new arithmetic.OP_NOT(),
  OP_0NOTEQUAL: new arithmetic.OP_0NOTEQUAL(),
  OP_ADD: new arithmetic.OP_ADD(),
  OP_SUB: new arithmetic.OP_SUB(),
  OP_MUL: new arithmetic.OP_MUL(),
  OP_DIV: new arithmetic.OP_DIV(),
  OP_MOD: new arithmetic.OP_MOD(),
  OP_LSHIFT: new arithmetic.OP_LSHIFT(),
  OP_RSHIFT: new arithmetic.OP_RSHIFT(),
  OP_BOOLAND: new arithmetic.OP_BOOLAND(),
  OP_BOOLOR: new arithmetic.OP_BOOLOR(),
  OP_NUMEQUAL: new arithmetic.OP_NUMEQUAL(),
  OP_NUMEQUALVERIFY: new arithmetic.OP_NUMEQUALVERIFY(),
  OP_NUMNOTEQUAL: new arithmetic.OP_NUMNOTEQUAL(),
  OP_LESSTHAN: new arithmetic.OP_LESSTHAN(),
  OP_GREATERTHAN: new arithmetic.OP_GREATERTHAN(),
  OP_LESSTHANOREQUAL: new arithmetic.OP_LESSTHANOREQUAL(),
  OP_GREATERTHANOREQUAL: new arithmetic.OP_GREATERTHANOREQUAL(),
  OP_MIN: new arithmetic.OP_MIN(),
  OP_MAX: new arithmetic.OP_MAX(),
  OP_WITHIN: new arithmetic.OP_WITHIN(),

  // crypto
  OP_RIPEMD160: new crypto.OP_RIPEMD160(),
  OP_SHA1: new crypto.OP_SHA1(),
  OP_SHA3: new crypto.OP_SHA3(),
  OP_SHA256: new crypto.OP_SHA256(),
  OP_HASH160: new crypto.OP_HASH160(),
  OP_HASH256: new crypto.OP_HASH256(),
  OP_CODESEPARATOR: new crypto.OP_CODESEPARATOR(),
  OP_CHECKSIG: new crypto.OP_CHECKSIG(),
  OP_CHECKSIGVERIFY: new crypto.OP_CHECKSIGVERIFY(),
  OP_CHECKMULTISIG: new crypto.OP_CHECKMULTISIG(),
  OP_CHECKMULTISIGVERIFY: new crypto.OP_CHECKMULTISIGVERIFY(),

  // expansion
  OP_NOP1: new expansion.OP_NOP1(),
  OP_CHECKLOCKTIMEVERIFY: new expansion.OP_CHECKLOCKTIMEVERIFY(),
  OP_NOP2: new expansion.OP_NOP2(),
  OP_CHECKSEQUENCEVERIFY: new expansion.OP_CHECKSEQUENCEVERIFY(),
  OP_NOP3: new expansion.OP_NOP3(),
  OP_NOP4: new expansion.OP_NOP4(),
  OP_NOP5: new expansion.OP_NOP5(),
  OP_NOP6: new expansion.OP_NOP6(),
  OP_NOP7: new expansion.OP_NOP7(),
  OP_NOP8: new expansion.OP_NOP8(),
  OP_NOP9: new expansion.OP_NOP9(),
  OP_NOP10: new expansion.OP_NOP10(),

  // invalid
  OP_INVALIDOPCODE: new invalid.OP_INVALIDOPCODE()
}

/**
 * Hex code mapping of all static OP_CODES
 */
const HEX_MAPPING: {
  [n: number]: StaticCode
} = {
  0x00: OP_CODES.OP_0,
  0x4f: OP_CODES.OP_1NEGATE,
  0x50: OP_CODES.OP_RESERVED,
  0x51: OP_CODES.OP_1,
  0x52: OP_CODES.OP_2,
  0x53: OP_CODES.OP_3,
  0x54: OP_CODES.OP_4,
  0x55: OP_CODES.OP_5,
  0x56: OP_CODES.OP_6,
  0x57: OP_CODES.OP_7,
  0x58: OP_CODES.OP_8,
  0x59: OP_CODES.OP_9,
  0x5a: OP_CODES.OP_10,
  0x5b: OP_CODES.OP_11,
  0x5c: OP_CODES.OP_12,
  0x5d: OP_CODES.OP_13,
  0x5e: OP_CODES.OP_14,
  0x5f: OP_CODES.OP_15,
  0x60: OP_CODES.OP_16,
  // control
  0x61: OP_CODES.OP_NOP,
  0x62: OP_CODES.OP_VER,
  0x63: OP_CODES.OP_IF,
  0x64: OP_CODES.OP_NOTIF,
  0x65: OP_CODES.OP_VERIF,
  0x66: OP_CODES.OP_VERNOTIF,
  0x67: OP_CODES.OP_ELSE,
  0x68: OP_CODES.OP_ENDIF,
  0x69: OP_CODES.OP_VERIFY,
  0x6a: OP_CODES.OP_RETURN,
  // stack
  0x6b: OP_CODES.OP_TOALTSTACK,
  0x6c: OP_CODES.OP_FROMALTSTACK,
  0x6d: OP_CODES.OP_2DROP,
  0x6e: OP_CODES.OP_2DUP,
  0x6f: OP_CODES.OP_3DUP,
  0x70: OP_CODES.OP_2OVER,
  0x71: OP_CODES.OP_2ROT,
  0x72: OP_CODES.OP_2SWAP,
  0x73: OP_CODES.OP_IFDUP,
  0x74: OP_CODES.OP_DEPTH,
  0x75: OP_CODES.OP_DROP,
  0x76: OP_CODES.OP_DUP,
  0x77: OP_CODES.OP_NIP,
  0x78: OP_CODES.OP_OVER,
  0x79: OP_CODES.OP_PICK,
  0x7a: OP_CODES.OP_ROLL,
  0x7b: OP_CODES.OP_ROT,
  0x7c: OP_CODES.OP_SWAP,
  0x7d: OP_CODES.OP_TUCK,
  // splice
  0x7e: OP_CODES.OP_CAT,
  0x7f: OP_CODES.OP_SUBSTR,
  0x80: OP_CODES.OP_LEFT,
  0x81: OP_CODES.OP_RIGHT,
  0x82: OP_CODES.OP_SIZE,
  // bitwise
  0x83: OP_CODES.OP_INVERT,
  0x84: OP_CODES.OP_AND,
  0x85: OP_CODES.OP_OR,
  0x86: OP_CODES.OP_XOR,
  0x87: OP_CODES.OP_EQUAL,
  0x88: OP_CODES.OP_EQUALVERIFY,
  0x89: OP_CODES.OP_RESERVED1,
  0x8a: OP_CODES.OP_RESERVED2,
  // numeric
  0x8b: OP_CODES.OP_1ADD,
  0x8c: OP_CODES.OP_1SUB,
  0x8d: OP_CODES.OP_2MUL,
  0x8e: OP_CODES.OP_2DIV,
  0x8f: OP_CODES.OP_NEGATE,
  0x90: OP_CODES.OP_ABS,
  0x91: OP_CODES.OP_NOT,
  0x92: OP_CODES.OP_0NOTEQUAL,
  0x93: OP_CODES.OP_ADD,
  0x94: OP_CODES.OP_SUB,
  0x95: OP_CODES.OP_MUL,
  0x96: OP_CODES.OP_DIV,
  0x97: OP_CODES.OP_MOD,
  0x98: OP_CODES.OP_LSHIFT,
  0x99: OP_CODES.OP_RSHIFT,
  0x9a: OP_CODES.OP_BOOLAND,
  0x9b: OP_CODES.OP_BOOLOR,
  0x9c: OP_CODES.OP_NUMEQUAL,
  0x9d: OP_CODES.OP_NUMEQUALVERIFY,
  0x9e: OP_CODES.OP_NUMNOTEQUAL,
  0x9f: OP_CODES.OP_LESSTHAN,
  0xa0: OP_CODES.OP_GREATERTHAN,
  0xa1: OP_CODES.OP_LESSTHANOREQUAL,
  0xa2: OP_CODES.OP_GREATERTHANOREQUAL,
  0xa3: OP_CODES.OP_MIN,
  0xa4: OP_CODES.OP_MAX,
  0xa5: OP_CODES.OP_WITHIN,
  // crypto
  0xa6: OP_CODES.OP_RIPEMD160,
  0xa7: OP_CODES.OP_SHA1,
  0xc0: OP_CODES.OP_SHA3,
  0xa8: OP_CODES.OP_SHA256,
  0xa9: OP_CODES.OP_HASH160,
  0xaa: OP_CODES.OP_HASH256,
  0xab: OP_CODES.OP_CODESEPARATOR,
  0xac: OP_CODES.OP_CHECKSIG,
  0xad: OP_CODES.OP_CHECKSIGVERIFY,
  0xae: OP_CODES.OP_CHECKMULTISIG,
  0xaf: OP_CODES.OP_CHECKMULTISIGVERIFY,
  // expansion
  0xb0: OP_CODES.OP_NOP1,
  0xb1: OP_CODES.OP_CHECKLOCKTIMEVERIFY,
  0xb2: OP_CODES.OP_CHECKSEQUENCEVERIFY,
  0xb3: OP_CODES.OP_NOP4,
  0xb4: OP_CODES.OP_NOP5,
  0xb5: OP_CODES.OP_NOP6,
  0xb6: OP_CODES.OP_NOP7,
  0xb7: OP_CODES.OP_NOP8,
  0xb8: OP_CODES.OP_NOP9,
  0xb9: OP_CODES.OP_NOP10,
  // invalid
  0xff: OP_CODES.OP_INVALIDOPCODE
}
