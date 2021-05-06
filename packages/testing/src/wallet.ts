import { RegTestContainer } from '@defichain/testcontainers'
/**
 * Create a new address
 *
 * @param {RegTestContainer} container
 * @return {Promise<string>}
 */
export async function getNewAddress (container: RegTestContainer): Promise<string> {
  return await container.call('getnewaddress')
}
