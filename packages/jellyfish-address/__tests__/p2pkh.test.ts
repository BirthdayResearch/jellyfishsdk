import bs58 from 'bs58'
import { MainNet, RegTest, TestNet } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { RegTestContainer } from '@defichain/testcontainers'
import { DeFiAddress, P2PKH } from '../src'

describe('P2PKH', () => {
  const container = new RegTestContainer()
  const p2pkhFixture = {
    mainnet: '8JBuS81VT8ouPrT6YS55qoS74D13Cw7h1Y',
    testnet: '7LMorkhKTDjbES6DfRxX2RiNMbeemUkxmp',
    regtest: '',

    invalid: 'JBuS81VT8ouPrT6YS55qoS74D13Cw7h1Y', // edited, removed prefix
    invalidChecksum: '8JBuS81VT8ouPrT6YS55qoS74D13Cw7h1X' // edited checksum (last char)
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    p2pkhFixture.regtest = await container.getNewAddress('', 'legacy')
  })

  afterAll(async () => await container.stop())

  describe('from() - valid address', () => {
    it('should get the type precisely', () => {
      const p2pkh = DeFiAddress.from('mainnet', p2pkhFixture.mainnet)
      expect(p2pkh.valid).toBeTruthy()
      expect(p2pkh.type).toBe('P2PKH')
      expect(p2pkh.constructor.name).toBe('P2PKH')
      expect(p2pkh.network).toBe(MainNet)
    })

    it('should work for all recognized network type', () => {
      const testnet = DeFiAddress.from('testnet', p2pkhFixture.testnet)
      expect(testnet.valid).toBeTruthy()
      expect(testnet.type).toBe('P2PKH')
      expect(testnet.constructor.name).toBe('P2PKH')
      expect(testnet.network).toBe(TestNet)

      const regtest = DeFiAddress.from('regtest', p2pkhFixture.regtest)
      expect(regtest.valid).toBeTruthy()
      expect(regtest.type).toBe('P2PKH')
      expect(regtest.constructor.name).toBe('P2PKH')
      expect(regtest.network).toBe(RegTest)
    })
  })

  describe('from() - invalid address', () => {
    it('should be able to validate in address prefix with network', () => {
      const invalid = DeFiAddress.from('mainnet', p2pkhFixture.invalid)
      expect(invalid.valid).toBeFalsy()
    })

    it('should be able to validate in address prefix with network', () => {
      // valid address, used on different network
      const p2pkh = DeFiAddress.from('testnet', p2pkhFixture.mainnet)
      expect(p2pkh.valid).toBeFalsy()
      // expect(p2pkh.type).toBe('P2PKH') // invalid address guessed type is not promising, as p2pkh and p2sh are versy similar
      expect(p2pkh.network).toBe(TestNet)
    })

    it('should get the type precisely', () => {
      const invalid = DeFiAddress.from('mainnet', p2pkhFixture.invalidChecksum)
      expect(invalid.valid).toBeFalsy()
    })
  })

  describe('to()', () => {
    it('should be able to build a new address using a public key hash (20 bytes, 40 char hex string)', () => {
      const pubKeyHash = '134b0749882c225e8647df3a3417507c6f5b2797'
      expect(pubKeyHash.length).toStrictEqual(40)

      const p2pkh = P2PKH.to('regtest', pubKeyHash)
      expect(p2pkh.type).toStrictEqual('P2PKH')
      expect(p2pkh.valid).toBeTruthy()

      const scriptStack = p2pkh.getScript()
      expect(scriptStack.stack.length).toStrictEqual(5)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_DUP)
      expect(scriptStack.stack[1]).toStrictEqual(OP_CODES.OP_HASH160)
      expect(scriptStack.stack[2]).toStrictEqual(OP_CODES.OP_PUSHDATA_HEX_LE(pubKeyHash))
      expect(scriptStack.stack[3]).toStrictEqual(OP_CODES.OP_EQUALVERIFY)
      expect(scriptStack.stack[4]).toStrictEqual(OP_CODES.OP_CHECKSIG)
    })

    it('should reject invalid data - not 20 bytes data', () => {
      const pubKeyHash = '134b0749882c225e8647df3a3417507c6f5b27'
      expect(pubKeyHash.length).toStrictEqual(38)

      expect(() => {
        P2PKH.to('regtest', pubKeyHash)
      }).toThrow('InvalidDataLength')
    })
  })

  describe('getScript()', () => {
    it('should refuse to build ops code stack for invalid address', () => {
      const invalid = DeFiAddress.from('testnet', p2pkhFixture.mainnet)
      expect(invalid.valid).toBeFalsy()
      try {
        invalid.getScript()
      } catch (e) {
        expect(e.message).toBe('InvalidDefiAddress')
      }
    })

    it('should be able to build script', async () => {
      const p2pkh = DeFiAddress.from('mainnet', p2pkhFixture.mainnet)
      const scriptStack = p2pkh.getScript()

      expect(scriptStack.stack.length).toStrictEqual(5)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_DUP)
      expect(scriptStack.stack[1]).toStrictEqual(OP_CODES.OP_HASH160)
      expect(scriptStack.stack[2].type).toStrictEqual('OP_PUSHDATA') // tested in `to()`
      expect(scriptStack.stack[3]).toStrictEqual(OP_CODES.OP_EQUALVERIFY)
      expect(scriptStack.stack[4]).toStrictEqual(OP_CODES.OP_CHECKSIG)
    })
  })

  it('validate()', () => {
    const hex = bs58.decode(p2pkhFixture.mainnet).toString('hex').substring(2, 42) // take 20 bytes data only
    const p2pkh = new P2PKH(MainNet, p2pkhFixture.mainnet, hex)

    expect(p2pkh.validatorPassed).toStrictEqual(0)
    expect(p2pkh.valid).toBeFalsy()

    const isValid = p2pkh.validate()
    expect(p2pkh.validatorPassed).toStrictEqual(5)
    expect(isValid).toBeTruthy()
  })

  it('guess()', () => {
    const p2pkh = DeFiAddress.guess(p2pkhFixture.mainnet)
    expect(p2pkh.valid).toBeTruthy()
    expect(p2pkh.type).toBe('P2PKH')
    expect(p2pkh.constructor.name).toBe('P2PKH')
    expect(p2pkh.network).toBe(MainNet)
  })
})
