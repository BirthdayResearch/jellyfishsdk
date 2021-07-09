import { WIF } from '@defichain/jellyfish-crypto'
import { GenesisKeys } from '@defichain/testcontainers'
import { WalletClassic } from '../src'

describe('WalletClassic', () => {
  let wallet: WalletClassic

  beforeAll(() => {
    wallet = new WalletClassic(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
  })

  it('should get public key', async () => {
    const pubKey = await wallet.publicKey()
    expect(pubKey.length).toStrictEqual(33)
    expect(pubKey.toString('hex')).toStrictEqual('022b60b1d1ec292c4de571baaf9a776137fac1b69da89e9a4274880aa71b9d4890')
  })

  it('should get private key', async () => {
    const privKey = await wallet.privateKey()
    expect(privKey.length).toStrictEqual(32)
    expect(privKey.toString('hex')).toStrictEqual('cf057c882aaa83a1461881812e9f1e9c7656e988a0847c2fbfb5b78bc7cdef5d')
  })

  it('should sign and verify', async () => {
    const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

    const signature = await wallet.sign(hash)
    expect(signature.toString('hex')).toStrictEqual('304402201832b770f7c0d8a124ab60552350c4347609dcd369c0cb39771300457a1abf4f022026da1f4bfeaf46c57ef230166ecd5b425d656c6321842cbcce98a54bec2153a9')

    const valid = await wallet.verify(hash, signature)
    expect(valid).toStrictEqual(true)
  })

  it('should sign transaction and fail because invalid', async () => {
    return await expect(async () => await wallet.signTx({
      version: 0,
      vin: [],
      vout: [],
      lockTime: 0
    }, [])
    ).rejects.toThrow()
  })
})
