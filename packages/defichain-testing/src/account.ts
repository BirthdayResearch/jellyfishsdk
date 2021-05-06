import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getNewAddress } from './wallet'

/**
 * send utxos to account
 *
 * @param {RegTestContainer} container
 * @param {number} _amount
 * @param {UtxosToAccountOptions} [options]
 * @param {string} [options.address]
 * @param {Promise<void>}
 */
export async function utxosToAccount (
  container: RegTestContainer,
  _amount?: number,
  options?: UtxosToAccountOptions
): Promise<void> {
  const amount = _amount ?? 100
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
 * @param {AccountToAccountOptions} options
 * @param {number} options.amount
 * @param {string} options.from
 * @param {string} [options.to]
 * @return {Promise<string>}
 */
export async function accountToAccount (
  container: MasterNodeRegTestContainer,
  symbol: string,
  options: AccountToAccountOptions
): Promise<string> {
  const to = options?.to ?? await getNewAddress(container)

  await container.call('accounttoaccount', [options.from, { [to]: `${options.amount.toString()}@${symbol}` }])
  await container.generate(25)

  return to
}

interface UtxosToAccountOptions {
  address?: string
}

interface AccountToAccountOptions {
  amount: number
  from: string
  to?: string
}
