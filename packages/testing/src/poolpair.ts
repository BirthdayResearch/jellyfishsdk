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
  const hashed = await container.call('createpoolpair', [metadata, options?.utxos])
  await container.generate(1)

  return hashed
}

export interface CreatePoolPairOptions {
  commission?: number
  status?: boolean
  ownerAddress?: string
  utxos?: CreatePoolPairUTXO[]
}
