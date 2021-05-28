import { MainNet, RegTest, TestNet } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { RegTestContainer } from '@defichain/testcontainers'
import { Address, DeFiAddress, P2SH } from '../src'

describe('P2SH', () => {
  const container = new RegTestContainer()
  const p2shFixture = {
    mainnet: 'dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf8',
    testnet: 'trsUzSh3Qcu1MURY1BKDjttJN6hxtoRxM2',
    regtest: '',

    invalid: 'FFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf8', // edited mainnet address, removed prefix
    invalidChecksum: 'dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf', // edited mainnet address, trim checksum
    validBtcAddress: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy' // valid btc p2sh
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    p2shFixture.regtest = await container.getNewAddress('', 'p2sh-segwit')
  })

  afterAll(async () => await container.stop())

  describe('from() - valid address', () => {
    it('should get the type precisely', () => {
      const p2sh = DeFiAddress.from(p2shFixture.mainnet)
      expect(p2sh.valid).toBeTruthy()
      expect(p2sh.type).toStrictEqual('P2SH')
      expect(p2sh.constructor.name).toStrictEqual('P2SH')
      expect(p2sh.network).toStrictEqual(MainNet)
    })

    it('should work for all recognized network type', () => {
      const testnet = DeFiAddress.from(p2shFixture.testnet)
      expect(testnet.valid).toBeTruthy()
      expect(testnet.type).toStrictEqual('P2SH')
      expect(testnet.constructor.name).toStrictEqual('P2SH')
      expect(testnet.network).toStrictEqual(TestNet)

      const regtest = DeFiAddress.from(p2shFixture.regtest)
      expect(regtest.valid).toBeTruthy()
      expect(regtest.type).toStrictEqual('P2SH')
      expect(regtest.constructor.name).toStrictEqual('P2SH')
      expect(regtest.network).toStrictEqual(RegTest)
    })
  })

  describe('from() - invalid address', () => {
    it('trimmed prefix', () => {
      const invalid = DeFiAddress.from(p2shFixture.invalid)
      expect(invalid.valid).toBeFalsy()
    })

    it('invalid checksum', () => {
      const invalid = DeFiAddress.from(p2shFixture.invalidChecksum)
      expect(invalid.valid).toBeFalsy()
    })

    it('non DFI (network) address should be invalid', () => {
      const btc = DeFiAddress.from(p2shFixture.validBtcAddress)
      expect(btc.valid).toBeFalsy()
    })
  })

  describe('to()', () => {
    it('should be able to build a new address using a public key hash (20 bytes, 40 char hex string)', () => {
      const scriptHash = '134b0749882c225e8647df3a3417507c6f5b2797'
      expect(scriptHash.length).toStrictEqual(40)

      const p2sh = P2SH.to('regtest', scriptHash)
      expect(p2sh.type).toStrictEqual('P2SH')
      expect(p2sh.valid).toBeTruthy()

      const scriptStack = p2sh.getScript()
      expect(scriptStack.stack.length).toStrictEqual(3)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_HASH160)
      expect(scriptStack.stack[1]).toStrictEqual(OP_CODES.OP_PUSHDATA_HEX_LE(scriptHash))
      expect(scriptStack.stack[2]).toStrictEqual(OP_CODES.OP_EQUAL)
    })

    it('should reject invalid data - not 20 bytes data', () => {
      const scriptHash = '134b0749882c225e8647df3a3417507c6f5b27'
      expect(scriptHash.length).toStrictEqual(38)

      try {
        P2SH.to('regtest', scriptHash)
        throw new Error('should had failed')
      } catch (e) {
        expect(e.message).toStrictEqual('InvalidDataLength')
      }
    })
  })

  describe('getScript()', () => {
    it('should be able to build script', async () => {
      const p2sh = DeFiAddress.from(p2shFixture.mainnet)
      const scriptStack = p2sh.getScript()

      expect(scriptStack.stack.length).toStrictEqual(3)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_HASH160)
      expect(scriptStack.stack[1].type).toStrictEqual('OP_PUSHDATA')
      expect(scriptStack.stack[2]).toStrictEqual(OP_CODES.OP_EQUAL)
    })
  })

  describe('constructor()', () => {
    let validAddress: Address

    beforeAll(() => {
      validAddress = DeFiAddress.from(p2shFixture.mainnet)
      expect(validAddress.valid).toBeTruthy()
    })

    it('should not be able to instantiate `valid` address - with invalid address length', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new P2SH(MainNet, validAddress.utf8String.slice(10), validAddress.buffer, true) // less than min length
      }).toThrow('InvalidDefiAddress')
    })

    it('should not be able to instantiate `valid` address - with invalid buffer length', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new P2SH(MainNet, validAddress.utf8String, (validAddress.buffer as Buffer).slice(1), true)
      }).toThrow('InvalidDefiAddress')
    })
  })
})
