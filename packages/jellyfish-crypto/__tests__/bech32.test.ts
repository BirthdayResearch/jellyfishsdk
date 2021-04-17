import { fromBech32, toBech32 } from '../src/bech32'
import { HASH160 } from '../src'

const hrp = 'bcrt'
const bech32 = 'bcrt1qykj5fsrne09yazx4n72ue4fwtpx8u65zac9zhn'
const pubKey = '03987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe81'

it('should convert bech32 to pubkey', () => {
  const buffer: Buffer = fromBech32(bech32)
  const hash160 = HASH160(Buffer.from(pubKey, 'hex'))
  expect(buffer.toString('hex')).toBe(hash160.toString('hex'))
})

it('should convert bech32 to pubkey with hrp and version', () => {
  const buffer: Buffer = fromBech32(bech32, 'bcrt', 0x00)
  const hash160 = HASH160(Buffer.from(pubKey, 'hex'))
  expect(buffer.toString('hex')).toBe(hash160.toString('hex'))
})

it('should fail convert bech32 to pubkey with invalid hrp', () => {
  expect(() => {
    fromBech32(bech32, 'tf', 0x00)
  }).toThrow('Invalid HRP: human readable part')
})

it('should fail convert bech32 to pubkey with invalid version', () => {
  expect(() => {
    // @ts-expect-error
    fromBech32(bech32, 'bcrt', 0x01)
  }).toThrow('Invalid witness version')
})

it('should convert pubkey to bech32', () => {
  const bech32 = toBech32(Buffer.from(pubKey, 'hex'), hrp)
  expect(bech32).toBe(bech32)
})

it('should convert pubkey to bech32 with witness version', () => {
  const bech32 = toBech32(Buffer.from(pubKey, 'hex'), hrp, 0x00)
  expect(bech32).toBe(bech32)
})
