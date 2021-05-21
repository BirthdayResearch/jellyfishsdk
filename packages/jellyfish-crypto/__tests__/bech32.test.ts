import { HASH160, Bech32, HRP } from '../src'

const keypair = {
  hrp: 'bcrt' as HRP,
  bech32: 'bcrt1qykj5fsrne09yazx4n72ue4fwtpx8u65zac9zhn',
  pubKey: '03987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe81'
}

it('should convert bech32 to hash160', () => {
  const buffer: Buffer = Bech32.toHash160(keypair.bech32)

  const pubKey = Buffer.from(keypair.pubKey, 'hex')
  const hash160 = HASH160(pubKey)

  expect(buffer.toString('hex')).toStrictEqual(hash160.toString('hex'))
})

it('should convert bech32 to hash160 with hrp and version', () => {
  const buffer: Buffer = Bech32.toHash160(keypair.bech32, 'bcrt', 0x00)

  const pubKey = Buffer.from(keypair.pubKey, 'hex')
  const hash160 = HASH160(pubKey)

  expect(buffer.toString('hex')).toStrictEqual(hash160.toString('hex'))
})

it('should fail convert bech32 to pubkey with invalid hrp', () => {
  expect(() => {
    Bech32.toHash160(keypair.bech32, 'tf', 0x00)
  }).toThrow('Invalid HRP: human readable part')
})

it('should fail convert bech32 to pubkey with invalid version', () => {
  expect(() => {
    // @ts-expect-error
    Bech32.toHash160(keypair.bech32, 'bcrt', 0x01)
  }).toThrow('Invalid witness version')
})

it('should convert pubkey to bech32', () => {
  const pubKey = Buffer.from(keypair.pubKey, 'hex')
  const bech32 = Bech32.fromPubKey(pubKey, keypair.hrp)
  expect(bech32).toStrictEqual(keypair.bech32)
})

it('should reject non 33 bytes long input (expected public key)', () => {
  expect(() => {
    // @ts-expect-error
    Bech32.fromPubKey(Buffer.from(keypair.pubKey, 'hex').slice(1), 'bcrt', 0x01)
  }).toThrow('InvalidPubKeyLength')
})

it('should convert pubkey to bech32 with witness version', () => {
  const pubKey = Buffer.from(keypair.pubKey, 'hex')
  const bech32 = Bech32.fromPubKey(pubKey, keypair.hrp, 0x00)
  expect(bech32).toStrictEqual(keypair.bech32)
})

it('should from bech32 to hash160 back to bech32', async () => {
  const hash160: Buffer = Bech32.toHash160(keypair.bech32)
  const bech32 = Bech32.fromHash160(hash160, keypair.hrp)
  expect(bech32).toStrictEqual(keypair.bech32)
})
