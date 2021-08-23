import { RegTestContainer } from '@defichain/testcontainers'

/**
 * Create a new address
 *
 * @param {RegTestContainer} container
 * @return {Promise<string>}
 * @deprecated use jellyfish-testing instead
 */
export async function getNewAddress (container: RegTestContainer): Promise<string> {
  return await container.call('getnewaddress')
}
