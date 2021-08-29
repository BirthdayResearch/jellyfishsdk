import { Bech32, Elliptic, EllipticPair, dSHA256 } from '@defichain/jellyfish-crypto'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { CTransaction, CTransactionSegWit, Transaction, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { SmartBuffer } from 'smart-buffer'
import BigNumber from 'bignumber.js'

/**
 * For test mocking only, obviously not secured.
 */
export function randomEllipticPair (): EllipticPair {
  return Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
}

/**
 * Clear all balance
 */
export async function clearEllipticPairBalance (container: MasterNodeRegTestContainer, ellipticPair: EllipticPair): Promise<void> {
  const pubKey = await ellipticPair.publicKey()
  const address = Bech32.fromPubKey(pubKey, 'bcrt')

  const unspent: any[] = await container.call('listunspent', [1, 9999999, [address]])
  if (unspent.length === 0) {
    return
  }

  const reuse = await container.getNewAddress()
  const amount: BigNumber = unspent
    .reduce((prev, utxo) => {
      return new BigNumber(utxo.amount).plus(prev)
    }, new BigNumber(0))
  const hex = await container.call('createrawtransaction', [
    unspent.map(({ txid, vout }) => ({ txid, vout })), [{ [reuse]: amount.minus(0.00005).toNumber() }]
  ])

  const signed = await container.call('signrawtransactionwithwallet', [hex])
  await container.call('sendrawtransaction', [signed.hex])
  await container.generate(1)
}

/**
 * Fund bech32 address
 */
export async function fundEllipticPair (container: MasterNodeRegTestContainer, ellipticPair: EllipticPair, amount: number): Promise<void> {
  const pubKey = await ellipticPair.publicKey()
  const address = Bech32.fromPubKey(pubKey, 'bcrt')

  await container.fundAddress(address, amount)
  await container.generate(1)
}

export async function sendTransaction (container: MasterNodeRegTestContainer, transaction: TransactionSegWit): Promise<TxOut[]> {
  const buffer = new SmartBuffer()
  new CTransactionSegWit(transaction).toBuffer(buffer)
  const hex = buffer.toBuffer().toString('hex')
  const txid = await container.call('sendrawtransaction', [hex])
  await container.generate(1)

  const tx = await container.call('getrawtransaction', [txid, true])
  return tx.vout as TxOut[]
}

export function calculateTxid (transaction: Transaction): string {
  const buffer = new SmartBuffer()
  new CTransaction(transaction).toBuffer(buffer)
  return dSHA256(buffer.toBuffer()).reverse().toString('hex')
}

export interface TxOut {
  value: number
  n: number
  scriptPubKey: {
    asm: string
    hex: string
    type: string
    addresses: string[]
    reqSigs: number
  }
  tokenId: number
}

export async function findOuts (outs: TxOut[], pair: EllipticPair): Promise<TxOut[]> {
  const pubKey = await pair.publicKey()
  const address = Bech32.fromPubKey(pubKey, 'bcrt')

  return outs.filter(value => {
    return value.scriptPubKey.addresses?.includes(address)
  })
}

export async function findOut (outs: TxOut[], pair: EllipticPair): Promise<TxOut> {
  return (await findOuts(outs, pair))[0]
}
