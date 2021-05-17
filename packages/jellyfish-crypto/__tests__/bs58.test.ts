import { Bs58, HASH160 } from '../src'

const fixture = {
  base58: 'dGrLbw2nTo7de6tKF6cxCyiymarNaB1jFi',
  prefix: 0x5a,
  h160: '25a544c073cbca4e88d59f95ccd52e584c7e6a82'
}

describe('toHash160()', () => {
  it('should convert base58 to hash160 + prefix', () => {
    const decoded = Bs58.toHash160(fixture.base58)
    expect(decoded.prefix).toEqual(fixture.prefix)
    expect(decoded.buffer.toString('hex')).toEqual(fixture.h160)
  })

  it('should reject invalid address, invalid charset', async () => {
    // edited last char, invalida checksum
    expect(() => {
      Bs58.toHash160('dGrLbw2nTo7de6tKF6cxCyiymarNaB1jFj')
    }).toThrow('InvalidBase58Address')
  })

  it('should reject invalid address, invalid charset', async () => {
    expect(() => {
      // edited, put 'O' invalid character into a normal valid address
      Bs58.toHash160('dGrLbw2nTo7de6tKF6cxCyiymarNaB1jFO')
    }).toThrow('Non-base58 character')
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
    expect(() => {
      Bs58.fromHash160(fixture.h160.substring(1), fixture.prefix)
    }).toThrow('InvalidDataLength')
  })

  it('should reject version prefix > 255 (1 byte)', () => {
    expect(() => {
      Bs58.fromHash160(fixture.h160, 256)
    }).toThrow('InvalidVersionPrefix')
  })
})

describe('fromPubKey()', () => {
  const thirdyThreeBytes = '03987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe81'
  const pubKey = Buffer.from(thirdyThreeBytes, 'hex')
  const invalidPubKey = Buffer.from(thirdyThreeBytes.slice(2), 'hex') // less 1 byte

  beforeAll(() => {
    expect(HASH160(pubKey).toString('hex')).toEqual(fixture.h160)
  })

  it('should convert prefix + hash160 to base58', () => {
    const address = Bs58.fromPubKey(pubKey, fixture.prefix)
    expect(address).toEqual(fixture.base58)
  })

  it('should reject non 33 bytes long data', () => {
    expect(() => {
      Bs58.fromPubKey(invalidPubKey, fixture.prefix)
    }).toThrow('InvalidPubKeyLength')
  })

  it('should reject version prefix > 255 (1 byte)', () => {
    expect(() => {
      Bs58.fromPubKey(pubKey, 256)
    }).toThrow('InvalidVersionPrefix')
  })
})
