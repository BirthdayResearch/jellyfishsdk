import BigNumber from 'bignumber.js'
import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { EllipticPair, Elliptic, Bech32, HRP, WIF } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'

type ContainerType = MasterNodeRegTestContainer | RegTestContainer

/**
 * send utxos to account
 *
 * @param {ContainerType} container
 * @param {number} _amount
 * @param {UtxosToAccountOptions} [options]
 * @param {string} [options.address]
 * @param {Promise<void>}
 */
export async function utxosToAccount (
  container: ContainerType,
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

/**
 * Create a new address
 *
 * @param {ContainerType} container
 * @return {Promise<string>}
 */
export async function getNewAddress (container: ContainerType): Promise<string> {
  return await container.call('getnewaddress')
}

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

export async function createSignedTxnHex (
  container: MasterNodeRegTestContainer,
  aAmount: number,
  bAmount: number,
  a: EllipticPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii')),
  b: EllipticPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
): Promise<string> {
  const aBech32 = Bech32.fromPubKey(await a.publicKey(), RegTest.bech32.hrp as HRP)
  const bBech32 = Bech32.fromPubKey(await b.publicKey(), RegTest.bech32.hrp as HRP)

  const { txid, vout } = await container.fundAddress(aBech32, aAmount)
  const inputs = [{ txid: txid, vout: vout }]

  const unsigned = await container.call('createrawtransaction', [inputs, {
    [bBech32]: new BigNumber(bAmount)
  }])
  const signed = await container.call('signrawtransactionwithkey', [unsigned, [
    WIF.encode(RegTest.wifPrefix, await a.privateKey())
  ]])
  return signed.hex
}

interface CreateTokenOptions {
  address?: string
}

interface MintTokensOptions {
  address?: string
  utxoAmount?: number
  mintAmount?: number
}

interface UtxosToAccountOptions {
  address?: string
}

interface AccountToAccountOptions {
  amount: number
  from: string
  to?: string
}

interface CreatePoolPairOptions {
  utxos?: string[]
}

interface CreateTokenMetadata {
  symbol: string
  name: string
  isDAT?: boolean
  mintable?: boolean
  tradeable?: boolean
  collateralAddress?: string
}

interface CreatePoolPairMetadata {
  tokenA: string
  tokenB: string
  commission: number
  status: boolean
  ownerAddress: string
}
