import { SmartBuffer } from 'smart-buffer'
import { TestNodeProvider } from './node.mock'
import { SigningInterface, WalletHdNode } from '../src'
import { CTransaction, OP_CODES, Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction/dist'
import BigNumber from 'bignumber.js'
import { HASH160 } from '@defichain/jellyfish-crypto'

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
    expect(pubKey.length).toStrictEqual(33)
    expect(pubKey.toString('hex')).toStrictEqual('03331bde25ae763c3872effa39a7b104dfd072d43a956d1c40c0aff7ede5fb1578')
  })

  it('should derive private key', async () => {
    const privKey = await node.privateKey()
    expect(privKey.length).toStrictEqual(32)
    expect(privKey.toString('hex')).toStrictEqual('3434272f31313239272f30273434272f31313239272f30273434272f31313239')
  })

  it('should derive sign and verify', async () => {
    const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

    const signature = await node.sign(hash)
    expect(signature.toString('hex')).toStrictEqual('3044022015707827c1bdfabfdbabb8d82f35c2cbe7b8d2fc1388a692469fe04879e4938802202eaf2033fb1b2cd69b5039457c283b9c80f082a6732f5460b983eb6947ca21bd')

    const valid = await node.verify(hash, signature)
    expect(valid).toStrictEqual(true)
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

const transaction: Transaction = {
  version: 0x00000004,
  lockTime: 0x00000000,
  vin: [{
    index: 0,
    script: { stack: [] },
    sequence: 4294967278,
    txid: '9f96ade4b41d5433f4eda31e1738ec2b36f6e7d1420d94a6af99801a88f7f7ff'
  }],
  vout: [{
    script: {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
      ]
    },
    value: new BigNumber('5.98'),
    tokenId: 0x00
  }]
}

const prevout: Vout = {
  script: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
    ]
  },
  value: new BigNumber('6'),
  tokenId: 0x00
}

describe('WalletHdNodeProvider', () => {
  let unsignedCalled: Array<{ buffer: Buffer, tx: Transaction }> = []
  let signedCalled: Array<{ buffer: Buffer, tx: TransactionSegWit }> = []

  const cb: SigningInterface = {
    unsigned: async (buffer, tx) => {
      unsignedCalled.push({ buffer, tx })
    },
    signed: async (buffer, tx) => {
      signedCalled.push({ buffer, tx })
    }
  }

  beforeEach(() => {
    unsignedCalled = []
    signedCalled = []
  })

  it('should throw if wallet hd node instance not stored in provider', async () => {
    const provider = new TestNodeProvider(cb)
    const node = provider.derive("44'/1129'/0'/0/0")
    expect(node).toBeTruthy()

    const pubKey = await node.publicKey()
    await expect(provider.signTx(transaction, [{
      ...prevout,
      script: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA(HASH160(pubKey), 'little')
        ]
      }
    }])).rejects.toThrow('WalletHdNode is not derived, instantiate one by using via `deriveAndAssign` before calling `WalletHdNodeProvider.signTx`')
  })

  it('should be instantiable with SigningInterface callback', async () => {
    const provider = new TestNodeProvider(cb)
    const node = provider.deriveAndAssign("44'/1129'/0'/0/0")
    expect(node).toBeTruthy()

    const signedTx = await provider.signTx(transaction, [{
      ...prevout,
      script: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA(HASH160(await node.publicKey()), 'little')
        ]
      }
    }])
    expect(unsignedCalled.length).toStrictEqual(1)
    expect(unsignedCalled[0].tx).toMatchObject(transaction)
    const expectedUnsignedBuffer = new SmartBuffer()
    new CTransaction(unsignedCalled[0].tx).toBuffer(expectedUnsignedBuffer)
    expect(unsignedCalled[0].buffer.compare(expectedUnsignedBuffer.toBuffer()))

    expect(signedCalled.length).toStrictEqual(1)
    expect(signedCalled[0].tx).toMatchObject(signedTx)
    const expectedSignedBuffer = new SmartBuffer()
    new CTransaction(signedCalled[0].tx).toBuffer(expectedSignedBuffer)
    expect(signedCalled[0].buffer.compare(expectedUnsignedBuffer.toBuffer()))
  })
})
