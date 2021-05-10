import { TestNodeProvider } from './node.mock'
import { WalletHdNode } from '../src'

it('should derive', () => {
  const provider = new TestNodeProvider()
  const node = provider.derive("44'/1129'/0'/0/0")

  expect(node).toBeTruthy()
})

describe("WalletHdNode: 44'/1129'/0'", () => {
  const provider = new TestNodeProvider()
  let node: WalletHdNode

  beforeAll(() => {
    node = provider.derive("44'/1129'/0'")
  })

  it('should derive public key', async () => {
    const pubKey = await node.publicKey()
    expect(pubKey.length).toBe(33)
    expect(pubKey.toString('hex')).toBe('03331bde25ae763c3872effa39a7b104dfd072d43a956d1c40c0aff7ede5fb1578')
  })

  it('should derive private key', async () => {
    const privKey = await node.privateKey()
    expect(privKey.length).toBe(32)
    expect(privKey.toString('hex')).toBe('3434272f31313239272f30273434272f31313239272f30273434272f31313239')
  })

  it('should derive sign and verify', async () => {
    const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

    const signature = await node.sign(hash)
    expect(signature.toString('hex')).toBe('3044022015707827c1bdfabfdbabb8d82f35c2cbe7b8d2fc1388a692469fe04879e4938802202eaf2033fb1b2cd69b5039457c283b9c80f082a6732f5460b983eb6947ca21bd')

    const valid = await node.verify(hash, signature)
    expect(valid).toBe(true)
  })

  it('should signed transaction and fail because invalid', async () => {
    return await expect(async () => await node.signTx({
      version: 0,
      vin: [],
      vout: [],
      lockTime: 0
    }, [])
    ).rejects.toThrow()
  })
})
