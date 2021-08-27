import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Bech32, Elliptic, EllipticPair, HRP, WIF } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'

/**
 * Create a signed transaction
 *
 * @param {MasterNodeRegTestContainer} container
 * @param {number} aAmount
 * @param {number} bAmount
 * @param {CreateSignedTxnHexOptions} options
 * @param {EllipticPair} options.aEllipticPair
 * @param {EllipticPair} options.bEllipticPair
 * @return {Promise<string>}
 * @deprecated use jellyfish-testing instead
 */
export async function createSignedTxnHex (
  container: MasterNodeRegTestContainer,
  aAmount: number,
  bAmount: number,
  options: CreateSignedTxnHexOptions = {
    aEllipticPair: Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii')),
    bEllipticPair: Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
  }
): Promise<string> {
  const aBech32 = Bech32.fromPubKey(await options.aEllipticPair.publicKey(), RegTest.bech32.hrp as HRP)
  const bBech32 = Bech32.fromPubKey(await options.bEllipticPair.publicKey(), RegTest.bech32.hrp as HRP)

  const { txid, vout } = await container.fundAddress(aBech32, aAmount)
  const inputs = [{ txid: txid, vout: vout }]

  const unsigned = await container.call('createrawtransaction', [inputs, {
    [bBech32]: new BigNumber(bAmount)
  }])

  const signed = await container.call('signrawtransactionwithkey', [unsigned, [
    WIF.encode(RegTest.wifPrefix, await options.aEllipticPair.privateKey())
  ]])

  return signed.hex
}

export interface CreateSignedTxnHexOptions {
  aEllipticPair: EllipticPair
  bEllipticPair: EllipticPair
}
