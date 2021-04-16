import { encode, decode, decodeAsEllipticPair } from '../src'

const REG_TEST_WIF = 'cQSsfYvYkK5tx3u1ByK2ywTTc9xJrREc1dd67ZrJqJUEMwgktPWN'
const privKey = '557c4bdff86e59015987c1c7f3328a1fb4c2177b5e834f09c8cd10fae51af93b'

it('should decode without version', () => {
  const decoded = decode(REG_TEST_WIF)

  expect(decoded.version).toBe(0xef)
  expect(decoded.compressed).toBe(true)
  expect(decoded.privateKey.toString('hex')).toBe(privKey)
})

it('should decode with failed version', () => {
  expect(() => {
    decode(REG_TEST_WIF, 0x80)
  }).toThrow('Invalid network version')
})

it('should decode with correct version', () => {
  const decoded = decode(REG_TEST_WIF, 0xef)

  expect(decoded.version).toBe(0xef)
  expect(decoded.compressed).toBe(true)
  expect(decoded.privateKey.toString('hex')).toBe(privKey)
})

it('should decode decodeAsEllipticPair', async () => {
  const pair = decodeAsEllipticPair(REG_TEST_WIF, 0xef)
  const key = await pair.privateKey()
  expect(key.toString('hex')).toBe(privKey)
})

it('should encode', () => {
  const wif = encode(0xef, Buffer.from(privKey, 'hex'))
  expect(wif).toBe(REG_TEST_WIF)
})
