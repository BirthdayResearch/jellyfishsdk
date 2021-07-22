import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { poolpair } from '@defichain/jellyfish-api-core'
import { getNewAddress } from './wallet'

/**
 * @param {MasterNodeRegTestContainer} container
 * @return {Promise<PoolPairsResult>}
 */
export async function listPoolPairs (container: MasterNodeRegTestContainer): Promise<poolpair.PoolPairsResult> {
  return await container.call('listpoolpairs')
}

/**
 *
 * @param {MasterNodeRegTestContainer} container
 * @param {string} tokenA
 * @param {string} tokenB
 * @param {CreatePoolPairOptions} [options]
 * @param {commission} [options.commission=0]
 * @param {boolean} [options.status=true]
 * @param {string} [options.ownerAddress]
 * @param {CreatePoolPairUTXO[]} [options.utxos]
 * @return {Promise<string>}
 */
export async function createPoolPair (
  container: MasterNodeRegTestContainer,
  tokenA: string,
  tokenB: string,
  options?: CreatePoolPairOptions
): Promise<string> {
  const metadata = {
    tokenA,
    tokenB,
    commission: options?.commission ?? 0,
    status: options?.status ?? true,
    ownerAddress: options?.ownerAddress ?? await getNewAddress(container)
  }
  const txid = await container.call('createpoolpair', [metadata, options?.utxos])
  await container.generate(1)
  return txid
}

export interface CreatePoolPairOptions {
  commission?: number
  status?: boolean
  ownerAddress?: string
  utxos?: poolpair.UTXO[]
}

/**
 * @param {MasterNodeRegTestContainer} container
 * @param {AddPoolLiquidity} options
 * @param {string} options.tokenA pair token symbol
 * @param {number} options.amountA pair amount
 * @param {string} options.tokenB pair token symbol
 * @param {number} options.amountB pair amount
 * @param {string} options.shareAddress for LP
 * @return {Promise<BigNumber>} amount LP token share
 */
export async function addPoolLiquidity (
  container: MasterNodeRegTestContainer,
  metadata: AddPoolLiquidityMetadata
): Promise<BigNumber> {
  const { amountA, amountB, tokenA, tokenB, shareAddress } = metadata
  const from = { '*': [`${amountA}@${tokenA}`, `${amountB}@${tokenB}`] }
  await container.call('addpoolliquidity', [from, shareAddress])
  await container.generate(1)

  const tokens: string[] = await container.call('getaccount', [shareAddress])
  const lpToken = tokens.find(value => value.endsWith(`@${tokenA}-${tokenB}`))
  if (lpToken === undefined) {
    throw new Error('LP token not found in account')
  }

  const amount = lpToken.replace(`@${tokenA}-${tokenB}`, '')
  return new BigNumber(amount)
}

export interface AddPoolLiquidityMetadata {
  tokenA: string
  amountA: number
  tokenB: string
  amountB: number
  shareAddress: string
}

/**
 * @param {MasterNodeRegTestContainer} container
 * @param {RemovePoolLiquidity} metadata
 * @param {string} metadata.address which has the LP token
 * @param {string} metadata.tokenLP to remove
 * @param {BigNumber} metadata.amountLP to remove
 * @return {Promise<string>} txid
 */
export async function removePoolLiquidity (
  container: MasterNodeRegTestContainer,
  metadata: RemovePoolLiquidityMetadata
): Promise<string> {
  const { address, tokenLP, amountLP } = metadata
  const amount = `${amountLP.toFixed(8)}@${tokenLP}`
  const txid = await container.call('removepoolliquidity', [address, amount])
  await container.generate(1)
  return txid
}

export interface RemovePoolLiquidityMetadata {
  address: string
  tokenLP: string
  amountLP: BigNumber
}

/**
 * @param {MasterNodeRegTestContainer} container
 * @param {PoolSwapMetadata} metadata
 * @param {string} metadata.from
 * @param {string} metadata.tokenFrom
 * @param {number} metadata.amountFrom
 * @param {string} metadata.to
 * @param {string} metadata.tokenTo
 * @param {number} [metadata.maxPrice]
 * @return {Promise<string>} txid
 */
export async function poolSwap (
  container: MasterNodeRegTestContainer,
  metadata: PoolSwapMetadata
): Promise<string> {
  const txid = await container.call('poolswap', [metadata])
  await container.generate(1)
  return txid
}

export interface PoolSwapMetadata {
  from: string
  tokenFrom: string
  amountFrom: number
  to: string
  tokenTo: string
  maxPrice?: number
}
