import { Bs58 } from '../src'

const fixture = {
  base58: 'dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf8',
  prefix: 0x5a,
  h160: '1410c734d66b986f2a7c2c340a1ee18d83d9b5a2',

  invalidCharset: 'dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1UfI',
  invalidChecksum: 'dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf7'
}

describe('toHash160()', () => {
  it('should convert base58 to hash160 + prefix', () => {
    const decoded = Bs58.toHash160(fixture.base58)
    expect(decoded.prefix).toEqual(fixture.prefix)
    expect(decoded.buffer.toString('hex')).toEqual(fixture.h160)
  })

  it('should reject invalid address, invalid charset', async () => {
    try {
      Bs58.toHash160(fixture.invalidCharset)
      throw new Error('should fail')
    } catch (e) {
      expect(e.message).toEqual('Non-base58 character')
    }
  })

  it('should reject invalid address, invalid charset', async () => {
    try {
      Bs58.toHash160(fixture.invalidChecksum)
      throw new Error('should fail')
    } catch (e) {
      expect(e.message).toEqual('InvalidBase58Address')
    }
  })
})

describe('fromHash160()', () => {
  it('should convert prefix + hash160 to base58', () => {
    const address = Bs58.fromHash160(Buffer.from(fixture.h160, 'hex'), fixture.prefix)
    expect(address).toEqual(fixture.base58)
  })

  it('should be able to take in hash160 string', () => {
    const address = Bs58.fromHash160(fixture.h160, fixture.prefix)
    expect(address).toEqual(fixture.base58)
  })

  it('should reject non 20 bytes long data', () => {
    try {
      Bs58.fromHash160(fixture.h160.substring(1), fixture.prefix)
      throw new Error('should fail')
    } catch (e) {
      expect(e.message).toEqual('InvalidDataLength')
    }
  })
})
