import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getNewAddress } from './wallet'
import { utxosToAccount } from './account'

/**
 * Create a new token
 *
 * @param {MasterNodeRegTestContainer} container
 * @param {CreateTokenMetadata} metadata
 * @param {string} metadata.symbol
 * @param {string} metadata.name
 * @param {boolean} [metadata.isDAT]
 * @param {boolean} [metadata.mintable]
 * @param {boolean} [metadata.tradeable]
 * @param {string} [metadata.collateralAddress]
 * @param {CreateTokenOptions} [options]
 * @param {string} [options.address]
 * @return {Promise<string>}
 */
export async function createToken (
  container: MasterNodeRegTestContainer,
  metadata: CreateTokenMetadata,
  options?: CreateTokenOptions
): Promise<string> {
  const address = options?.address ?? await getNewAddress(container)
  const defaultMetadata = {
    isDAT: true,
    mintable: true,
    tradeable: true,
    collateralAddress: address
  }
  const hashed = await container.call('createtoken', [{ ...defaultMetadata, ...metadata }])
  await container.generate(25)

  return hashed
}

/**
 * Mint tokens
 *
 * @param {MasterNodeRegTestContainer} container
 * @param {string} symbol
 * @param {MintTokensOptions} [options]
 * @param {string} [options.address]
 * @param {number} [options.utxoAmount]
 * @param {number} [options.mintAmount]
 * @return {Promise<string>}
 */
export async function mintTokens (
  container: MasterNodeRegTestContainer,
  symbol: string,
  options?: MintTokensOptions
): Promise<string> {
  const address = options?.address ?? await getNewAddress(container)
  const utxoAmount = options?.utxoAmount ?? 100
  const mintAmount = options?.mintAmount ?? 2000

  await utxosToAccount(container, utxoAmount, { address })

  const hashed = await container.call('minttokens', [`${mintAmount}@${symbol}`])

  await container.generate(25)

  return hashed
}

interface CreateTokenOptions {
  address?: string
}

interface MintTokensOptions {
  address?: string
  utxoAmount?: number
  mintAmount?: number
}

interface CreateTokenMetadata {
  symbol: string
  name: string
  isDAT?: boolean
  mintable?: boolean
  tradeable?: boolean
  collateralAddress?: string
}
