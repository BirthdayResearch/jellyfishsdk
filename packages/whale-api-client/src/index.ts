export * from './errors'

export * as rpc from './api/rpc'
export * as address from './api/address'
export * as poolpairs from './api/poolpairs'
export * as transactions from './api/transactions'
export * as tokens from './api/tokens'
export * as masternodes from './api/masternodes'
export * as blocks from './api/blocks'
export * as oracles from './api/oracles'
export * as prices from './api/prices'
export * as stats from './api/stats'
export * as rawtx from './api/rawtx'
export * as fee from './api/fee'
export * as loan from './api/loan'

export * from './whale.api.client'
export * from './whale.api.response'
export * from './whale.rpc.client'

export { AddressToken, AddressHistory } from './api/address'
export {
  CollateralToken,
  LoanScheme,
  LoanToken,
  LoanVaultActive,
  LoanVaultLiquidated,
  LoanVaultLiquidationBatch,
  LoanVaultTokenAmount,
  LoanVaultState
} from './api/loan'
export { MasternodeData, MasternodeState } from './api/masternodes'
export { PoolPairData, PoolSwap, PoolSwapAggregated, PoolSwapAggregatedInterval } from './api/poolpairs'
export { ActivePrice, PriceOracle } from './api/prices'
export { StatsData, SupplyData } from './api/stats'
export { TokenData } from './api/tokens'
export { version } from './version'
