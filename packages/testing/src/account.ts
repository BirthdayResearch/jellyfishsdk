import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getNewAddress } from './wallet'

/**
 * Send utxos to account.
 * This method will also ensure there is enough UTXO to be send to the address.
 *
 * @param {MasterNodeRegTestContainer} container
 * @param {number} amount
 * @param {UtxosToAccountOptions} [options]
 * @param {string} [options.address]
 * @return {Promise<void>}
 * @deprecated use jellyfish-testing instead
 */
export async function utxosToAccount (
  container: MasterNodeRegTestContainer,
  amount: number,
  options?: UtxosToAccountOptions
): Promise<void> {
  await container.waitForWalletBalanceGTE(amount + 0.1)

  const address = options?.address ?? await getNewAddress(container)
  const payload: { [key: string]: string } = {}
  payload[address] = `${amount.toString()}@0`
  await container.call('utxostoaccount', [payload])
  await container.generate(1)
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
 * @deprecated use jellyfish-testing instead
 */
export async function accountToAccount (
  container: MasterNodeRegTestContainer,
  symbol: string,
  amount: number,
  options: AccountToAccountOptions
): Promise<string> {
  const to = options?.to ?? await getNewAddress(container)

  await container.call('accounttoaccount', [options.from, { [to]: `${amount.toString()}@${symbol}` }])
  await container.generate(1)

  return to
}

/**
 * @param {MasterNodeRegTestContainer} container
 * @param {string} address to send to
 * @param {number} amount to send
 * @param {string} symbol of the token to send
 * @return {string} hash of transaction
 * @deprecated use jellyfish-testing instead
 */
export async function sendTokensToAddress (
  container: MasterNodeRegTestContainer,
  address: string,
  amount: number,
  symbol: string
): Promise<string> {
  const txid = await container.call('sendtokenstoaddress', [{}, { [address]: [`${amount}@${symbol}`] }])
  await container.generate(1)
  return txid
}

export interface UtxosToAccountOptions {
  address?: string
}

interface AccountToAccountOptions {
  from: string
  to?: string
}
