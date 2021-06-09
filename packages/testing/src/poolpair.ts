import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { poolpair } from '@defichain/jellyfish-api-core'
import { getNewAddress } from './wallet'

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
  utxos?: poolpair.CreatePoolPairUTXO[]
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
  options: AddPoolLiquidity
): Promise<BigNumber> {
  const { amountA, amountB, tokenA, tokenB, shareAddress } = options
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

export interface AddPoolLiquidity {
  tokenA: string
  amountA: number
  tokenB: string
  amountB: number
  shareAddress: string
}

/**
 * @param {MasterNodeRegTestContainer} container
 * @param {RemovePoolLiquidity} options
 * @param {string} options.address which has the LP token
 * @param {string} options.tokenLP to remove
 * @param {BigNumber} options.amountLP to remove
 * @return {Promise<string>} txid
 */
export async function removePoolLiquidity (
  container: MasterNodeRegTestContainer,
  options: RemovePoolLiquidity
): Promise<string> {
  const { address, tokenLP, amountLP } = options
  const amount = `${amountLP.toFixed(8)}@${tokenLP}`
  const txid = await container.call('removepoolliquidity', [address, amount])
  await container.generate(1)
  return txid
}

export interface RemovePoolLiquidity {
  address: string
  tokenLP: string
  amountLP: BigNumber
}
