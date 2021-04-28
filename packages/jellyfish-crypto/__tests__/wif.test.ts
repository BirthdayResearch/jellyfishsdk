import { WIF } from '../src'

const REG_TEST_WIF = 'cQSsfYvYkK5tx3u1ByK2ywTTc9xJrREc1dd67ZrJqJUEMwgktPWN'
const privKey = '557c4bdff86e59015987c1c7f3328a1fb4c2177b5e834f09c8cd10fae51af93b'
const pubKey = '03987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe81'

it('should decode without version', () => {
  const decoded = WIF.decode(REG_TEST_WIF)

  expect(decoded.version).toBe(0xef)
  expect(decoded.compressed).toBe(true)
  expect(decoded.privateKey.toString('hex')).toBe(privKey)
})

it('should decode with failed version', () => {
  expect(() => {
    WIF.decode(REG_TEST_WIF, 0x80)
  }).toThrow('Invalid network version')
})

it('should decode with correct version', () => {
  const decoded = WIF.decode(REG_TEST_WIF, 0xef)

  expect(decoded.version).toBe(0xef)
  expect(decoded.compressed).toBe(true)
  expect(decoded.privateKey.toString('hex')).toBe(privKey)
})

it('should decode decodeAsEllipticPair', async () => {
  const pair = WIF.asEllipticPair(REG_TEST_WIF, 0xef)
  const privateKey = await pair.privateKey()
  const publicKey = await pair.publicKey()
  expect(privateKey.toString('hex')).toBe(privKey)
  expect(publicKey.toString('hex')).toBe(pubKey)
})

it('should encode', () => {
  const wif = WIF.encode(0xef, Buffer.from(privKey, 'hex'))
  expect(wif).toBe(REG_TEST_WIF)
})
