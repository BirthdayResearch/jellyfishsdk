import { Elliptic } from '../src'

// Test vector taken from https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki

it('should return privateKey from getEllipticPairFromPrivateKey ', async () => {
  const privateKeyHex = 'bbc27228ddcb9209d7fd6f36b02f7dfa6252af40bb2f1cbc7a557da8027ff866'
  const privateKey = Buffer.from(privateKeyHex, 'hex')
  const curvePair = Elliptic.fromPrivKey(privateKey)

  const getPrivKey: Buffer = await curvePair.privateKey()
  expect(getPrivKey.toString('hex')).toBe(privateKeyHex)
})

describe('keypair', () => {
  const privateKeyHex = '619c335025c7f4012e556c2a58b2506e30b8511b53ade95ea316fd8c3286feb9'
  const publicKeyHex = '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'

  it('should return publicKey from getEllipticPairFromPrivateKey', async () => {
    const privateKey = Buffer.from(privateKeyHex, 'hex')
    const curvePair = Elliptic.fromPrivKey(privateKey)

    const getPubKey: Buffer = await curvePair.publicKey()
    expect(getPubKey.toString('hex')).toBe(publicKeyHex)
  })

  it('should return privateKey from getEllipticPairFromPrivateKey ', async () => {
    const privateKey = Buffer.from(privateKeyHex, 'hex')
    const curvePair = Elliptic.fromPrivKey(privateKey)

    const getPrivKey: Buffer = await curvePair.privateKey()
    expect(getPrivKey.toString('hex')).toBe(privateKeyHex)
  })
})

describe('DER Signature: sign and verify', () => {
  async function shouldReturnPubKeyFromPubKey (privateKeyHex: string, publicKeyHex: string): Promise<void> {
    const privateKey = Buffer.from(privateKeyHex, 'hex')
    const curvePair = Elliptic.fromPrivKey(privateKey)

    const getPubKey: Buffer = await curvePair.publicKey()
    expect(getPubKey.toString('hex')).toBe(publicKeyHex)
  }

  async function shouldSignHashBufferGetSignature (privateKeyHex: string, hashHex: string, signatureHex: string): Promise<void> {
    const privateKey = Buffer.from(privateKeyHex, 'hex')
    const curvePair = Elliptic.fromPrivKey(privateKey)

    const hash = Buffer.from(hashHex, 'hex')
    const signature = await curvePair.sign(hash)
    expect(signature.toString('hex')).toBe(signatureHex)
  }

  async function shouldVerifyHashWithSignature (privateKeyHex: string, hashHex: string, signatureHex: string): Promise<void> {
    const privateKey = Buffer.from(privateKeyHex, 'hex')
    const curvePair = Elliptic.fromPrivKey(privateKey)

    const hash = Buffer.from(hashHex, 'hex')
    const signature = Buffer.from(signatureHex, 'hex')

    const isValid = await curvePair.verify(hash, signature)
    expect(isValid).toBe(true)
  }

  describe('30 44<0220<>0220<>> 1', () => {
    const privateKeyHex = '619c335025c7f4012e556c2a58b2506e30b8511b53ade95ea316fd8c3286feb9'
    const publicKeyHex = '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
    const hashHex = 'c37af31116d1b27caf68aae9e3ac82f1477929014d5b917657d0eb49478cb670'
    const signatureHex = '304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee'

    it('should return publicKey from privateKey', async () => {
      return await shouldReturnPubKeyFromPubKey(privateKeyHex, publicKeyHex)
    })

    it('should sign hash Buffer and get signature', async () => {
      return await shouldSignHashBufferGetSignature(privateKeyHex, hashHex, signatureHex)
    })

    it('should verify hash with signature', async () => {
      return await shouldVerifyHashWithSignature(privateKeyHex, hashHex, signatureHex)
    })
  })

  describe('30 44<0220<>0220<>> 2', () => {
    const privateKeyHex = 'f52b3484edd96598e02a9c89c4492e9c1e2031f471c49fd721fe68b3ce37780d'
    const publicKeyHex = '0392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98'
    const hashHex = 'cd72f1f1a433ee9df816857fad88d8ebd97e09a75cd481583eb841c330275e54'
    const signatureHex = '30440220032521802a76ad7bf74d0e2c218b72cf0cbc867066e2e53db905ba37f130397e02207709e2188ed7f08f4c952d9d13986da504502b8c3be59617e043552f506c46ff'

    it('should return publicKey from privateKey', async () => {
      return await shouldReturnPubKeyFromPubKey(privateKeyHex, publicKeyHex)
    })

    it('should sign hash Buffer and get signature', async () => {
      return await shouldSignHashBufferGetSignature(privateKeyHex, hashHex, signatureHex)
    })

    it('should verify hash with signature', async () => {
      return await shouldVerifyHashWithSignature(privateKeyHex, hashHex, signatureHex)
    })
  })

  describe('30 45<0221<>0220<>> 1', () => {
    const privateKeyHex = 'f52b3484edd96598e02a9c89c4492e9c1e2031f471c49fd721fe68b3ce37780d'
    const publicKeyHex = '0392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98'
    const hashHex = 'e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a'
    const signatureHex = '3045022100f6a10b8604e6dc910194b79ccfc93e1bc0ec7c03453caaa8987f7d6c3413566002206216229ede9b4d6ec2d325be245c5b508ff0339bf1794078e20bfe0babc7ffe6'

    it('should return publicKey from privateKey', async () => {
      return await shouldReturnPubKeyFromPubKey(privateKeyHex, publicKeyHex)
    })

    it('should sign hash Buffer and verify signature', async () => {
      const privateKey = Buffer.from(privateKeyHex, 'hex')
      const curvePair = Elliptic.fromPrivKey(privateKey)

      const hash = Buffer.from(hashHex, 'hex')
      const signature = await curvePair.sign(hash)
      expect(curvePair.verify(hash, signature)).toBeTruthy()
    })

    it('should verify hash with signature', async () => {
      return await shouldVerifyHashWithSignature(privateKeyHex, hashHex, signatureHex)
    })
  })

  describe('30 45<0221<>0220<>> 2', () => {
    const privateKeyHex = 'f52b3484edd96598e02a9c89c4492e9c1e2031f471c49fd721fe68b3ce37780d'
    const publicKeyHex = '0392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98'
    const hashHex = 'e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a'
    const signatureHex = '3045022100f6a10b8604e6dc910194b79ccfc93e1bc0ec7c03453caaa8987f7d6c3413566002206216229ede9b4d6ec2d325be245c5b508ff0339bf1794078e20bfe0babc7ffe6'

    it('should return publicKey from privateKey', async () => {
      return await shouldReturnPubKeyFromPubKey(privateKeyHex, publicKeyHex)
    })

    it('should sign hash Buffer and verify signature', async () => {
      const privateKey = Buffer.from(privateKeyHex, 'hex')
      const curvePair = Elliptic.fromPrivKey(privateKey)

      const hash = Buffer.from(hashHex, 'hex')
      const signature = await curvePair.sign(hash)
      expect(curvePair.verify(hash, signature)).toBeTruthy()
    })

    it('should verify hash with signature', async () => {
      return await shouldVerifyHashWithSignature(privateKeyHex, hashHex, signatureHex)
    })
  })
})
