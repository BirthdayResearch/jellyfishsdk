import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getNewAddress } from './wallet'

/**
 *
 * @param {MasterNodeRegTestContainer} container
 * @param {CreatePoolPairMetadata} metadata
 * @param {string} metadata.tokenA
 * @param {string} metadata.tokenB
 * @param {commission} metadata.commission
 * @param {boolean} metadata.status
 * @param {string} metadata.ownerAddress
 * @param {CreatePoolPairOptions} [options]
 * @param {string[]} [options.utxos]
 * @return {Promise<string>}
 */
export async function createPoolPair (
  container: MasterNodeRegTestContainer,
  metadata: CreatePoolPairMetadata,
  options?: CreatePoolPairOptions
): Promise<string> {
  const address = await getNewAddress(container)
  const defaultMetadata = {
    commission: 0,
    status: true,
    ownerAddress: address
  }
  const hashed = await container.call('createpoolpair', [{ ...defaultMetadata, ...metadata }, options?.utxos])
  await container.generate(1)

  return hashed
}

interface CreatePoolPairOptions {
  utxos?: string[]
}

interface CreatePoolPairMetadata {
  tokenA: string
  tokenB: string
  commission: number
  status: boolean
  ownerAddress: string
}
