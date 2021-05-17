import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { CreatePoolPairUTXO } from '@defichain/jellyfish-api-core/dist/category/poolpair'
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
  utxos?: CreatePoolPairUTXO[]
}

/**
 * @param {MasterNodeRegTestContainer} container
 * @param {string} tokenA pair token symbol
 * @param {number} amountA pair amount
 * @param {string} tokenB pair token symbol
 * @param {number} amountB pair amount
 * @param {string} shareAddress for LP
 * @return {Promise<BigNumber>} amount LP token share
 */
export async function addPoolLiquidity (
  container: MasterNodeRegTestContainer,
  tokenA: string,
  amountA: number,
  tokenB: string,
  amountB: number,
  shareAddress: string
): Promise<BigNumber> {
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

/**
 * @param {MasterNodeRegTestContainer} container
 * @param {string} address which has the LP token
 * @param {string} tokenLP to remove
 * @param {BigNumber} amountLP to remove
 * @return {Promise<string>} txid
 */
export async function removePoolLiquidity (
  container: MasterNodeRegTestContainer,
  address: string,
  tokenLP: string,
  amountLP: BigNumber
): Promise<string> {
  const amount = `${amountLP.toFixed(8)}@${tokenLP}`
  const txid = await container.call('removepoolliquidity', [address, amount])
  await container.generate(1)
  return txid
}
