import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getNewAddress } from './wallet'

/**
 * send utxos to account
 *
 * @param {RegTestContainer} container
 * @param {number} amount
 * @param {UtxosToAccountOptions} [options]
 * @param {string} [options.address]
 * @param {Promise<void>}
 */
export async function utxosToAccount (
  container: RegTestContainer,
  amount: number,
  options?: UtxosToAccountOptions
): Promise<void> {
  const address = options?.address ?? await getNewAddress(container)
  const payload: { [key: string]: string } = {}
  payload[address] = `${amount.toString()}@0`
  await container.call('utxostoaccount', [payload])
}

/**
 * send utxos from account to account
 *
 * @param {MasterNodeRegTestContainer} container
 * @param {string} symbol
 * @param {number} amount
 * @param {AccountToAccountOptions} options
 * @param {string} options.from
 * @param {string} [options.to]
 * @return {Promise<string>}
 */
export async function accountToAccount (
  container: MasterNodeRegTestContainer,
  symbol: string,
  amount: number,
  options: AccountToAccountOptions
): Promise<string> {
  const to = options?.to ?? await getNewAddress(container)

  await container.call('accounttoaccount', [options.from, { [to]: `${amount.toString()}@${symbol}` }])
  await container.generate(25)

  return to
}

export interface UtxosToAccountOptions {
  address?: string
}

interface AccountToAccountOptions {
  from: string
  to?: string
}
