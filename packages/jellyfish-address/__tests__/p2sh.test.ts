import bs58 from 'bs58'
import { MainNet, RegTest, TestNet } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction/src/script'
import { RegTestContainer } from '@defichain/testcontainers'
import * as DeFiAddress from '../src'
import { P2SH } from '../src'

describe('P2SH', () => {
  const container = new RegTestContainer()
  const p2shFixture = {
    mainnet: 'dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf8',
    testnet: 'trsUzSh3Qcu1MURY1BKDjttJN6hxtoRxM2',
    regtest: '',

    invalid: 'FFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf8', // edited mainnet address, removed prefix
    invalidChecksum: 'dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf' // edited mainnet address, trim checksum
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    p2shFixture.regtest = await container.getNewAddress('', 'p2sh-segwit')
  })

  afterAll(async () => await container.stop())

  describe('from() - valid address', () => {
    it('should get the type precisely', () => {
      const p2sh = DeFiAddress.from('mainnet', p2shFixture.mainnet)
      expect(p2sh.valid).toBeTruthy()
      expect(p2sh.type).toBe('P2SH')
      expect(p2sh.constructor.name).toBe('P2SH')
      expect(p2sh.network).toBe(MainNet)
    })

    it('should work for all recognized network type', () => {
      const testnet = DeFiAddress.from('testnet', p2shFixture.testnet)
      expect(testnet.valid).toBeTruthy()
      expect(testnet.type).toBe('P2SH')
      expect(testnet.constructor.name).toBe('P2SH')
      expect(testnet.network).toBe(TestNet)

      const regtest = DeFiAddress.from('regtest', p2shFixture.regtest)
      expect(regtest.valid).toBeTruthy()
      expect(regtest.type).toBe('P2SH')
      expect(regtest.constructor.name).toBe('P2SH')
      expect(regtest.network).toBe(RegTest)
    })
  })

  describe('from() - invalid address', () => {
    it('trimmed prefix', () => {
      const invalid = DeFiAddress.from('mainnet', p2shFixture.invalid)
      expect(invalid.valid).toBeFalsy()
    })

    it('should be able to validate in address prefix with network', () => {
      // valid address, used on different network
      const p2sh = DeFiAddress.from('testnet', p2shFixture.mainnet)
      expect(p2sh.valid).toBeFalsy()
      // expect(p2sh.type).toBe('P2SH') // invalid address guessed type is not promising, as p2sh and p2sh are versy similar
      expect(p2sh.network).toBe(TestNet)
    })

    it('should get the type precisely', () => {
      const invalid = DeFiAddress.from('mainnet', p2shFixture.invalidChecksum)
      expect(invalid.valid).toBeFalsy()
    })
  })

  describe('to()', () => {
    it('should be able to build a new address using a public key hash (20 bytes, 40 char hex string)', () => {
      const scriptHash = '134b0749882c225e8647df3a3417507c6f5b2797'
      expect(scriptHash.length).toEqual(40)

      const p2sh = P2SH.to('regtest', scriptHash)
      expect(p2sh.type).toEqual('P2SH')
      expect(p2sh.valid).toBeTruthy()

      const scriptStack = p2sh.getScript()
      expect(scriptStack.stack.length).toEqual(3)
      expect(scriptStack.stack[0]).toEqual(OP_CODES.OP_HASH160)
      expect(scriptStack.stack[1]).toEqual(OP_CODES.OP_PUSHDATA_HEX_LE(scriptHash))
      expect(scriptStack.stack[2]).toEqual(OP_CODES.OP_EQUAL)
    })

    it('should reject invalid data - not 20 bytes data', () => {
      const scriptHash = '134b0749882c225e8647df3a3417507c6f5b27'
      expect(scriptHash.length).toEqual(38)

      try {
        P2SH.to('regtest', scriptHash)
        throw new Error('should had failed')
      } catch (e) {
        expect(e.message).toEqual('InvalidDataLength')
      }
    })
  })

  describe('getScript()', () => {
    it('should refuse to build ops code stack for invalid address', () => {
      const invalid = DeFiAddress.from('testnet', p2shFixture.mainnet)
      expect(invalid.valid).toBeFalsy()
      try {
        invalid.getScript()
      } catch (e) {
        expect(e.message).toBe('InvalidDefiAddress')
      }
    })

    it('should be able to build script', async () => {
      const p2sh = DeFiAddress.from('mainnet', p2shFixture.mainnet)
      const scriptStack = p2sh.getScript()

      expect(scriptStack.stack.length).toEqual(3)
      expect(scriptStack.stack[0]).toEqual(OP_CODES.OP_HASH160)
      expect(scriptStack.stack[1].type).toEqual('OP_PUSHDATA')
      expect(scriptStack.stack[2]).toEqual(OP_CODES.OP_EQUAL)
    })
  })

  it('validate()', () => {
    const hex = bs58.decode(p2shFixture.mainnet).toString('hex').substring(2, 42) // take 20 bytes data only
    const p2sh = new P2SH(MainNet, p2shFixture.mainnet, hex)

    expect(p2sh.validatorPassed).toEqual(0)
    expect(p2sh.valid).toBeFalsy()

    const isValid = p2sh.validate()
    expect(p2sh.validatorPassed).toEqual(5)
    expect(isValid).toBeTruthy()
  })

  it('guess()', () => {
    const p2sh = DeFiAddress.guess(p2shFixture.mainnet)
    expect(p2sh.valid).toBeTruthy()
    expect(p2sh.type).toBe('P2SH')
    expect(p2sh.constructor.name).toBe('P2SH')
    expect(p2sh.network).toBe(MainNet)
  })
})
