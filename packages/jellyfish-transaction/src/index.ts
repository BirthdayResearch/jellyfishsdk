/**
 * DeFi Blockchain Transaction Constants
 * https://github.com/DeFiCh/ain/blob/master/src/primitives/transaction.h
 */
export const DeFiTransactionConstants = {
  Version: 0x00000004, // 4 bytes
  WitnessMarker: 0x00, // 1 byte
  WitnessFlag: 0x01 // 1 byte
}

export * from './script'
export * from './tx'
export * from './tx_composer'
export * from './tx_segwit'

/**
 * Need to refactor this interface, it's not consistent
 */
export { toBuffer, toOPCodes, toBuffer as fromOPCodes } from './script/_buffer'
