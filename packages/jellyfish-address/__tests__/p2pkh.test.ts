import { MainNet, RegTest, TestNet } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { RegTestContainer } from '@defichain/testcontainers'
import { Address, DeFiAddress, P2PKH } from '../src'

describe('P2PKH', () => {
  const container = new RegTestContainer()
  const p2pkhFixture = {
    mainnet: '8JBuS81VT8ouPrT6YS55qoS74D13Cw7h1Y',
    testnet: '7LMorkhKTDjbES6DfRxX2RiNMbeemUkxmp',
    regtest: '',

    invalid: 'JBuS81VT8ouPrT6YS55qoS74D13Cw7h1Y', // edited, removed prefix
    invalidChecksum: '8JBuS81VT8ouPrT6YS55qoS74D13Cw7h1X', // edited checksum (last char)
    validBtcAddress: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2' // valid btc p2pkh
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    p2pkhFixture.regtest = await container.getNewAddress('', 'legacy')
  })

  afterAll(async () => await container.stop())

  describe('from() - valid address', () => {
    it('should get the type precisely', () => {
      const p2pkh = DeFiAddress.from(p2pkhFixture.mainnet)
      expect(p2pkh.valid).toBeTruthy()
      expect(p2pkh.type).toStrictEqual('P2PKH')
      expect(p2pkh.constructor.name).toStrictEqual('P2PKH')
      expect(p2pkh.network).toStrictEqual(MainNet)
    })

    it('should work for all recognized network type', () => {
      const testnet = DeFiAddress.from(p2pkhFixture.testnet)
      expect(testnet.valid).toBeTruthy()
      expect(testnet.type).toStrictEqual('P2PKH')
      expect(testnet.constructor.name).toStrictEqual('P2PKH')
      expect(testnet.network).toStrictEqual(TestNet)

      const regtest = DeFiAddress.from(p2pkhFixture.regtest)
      expect(regtest.valid).toBeTruthy()
      expect(regtest.type).toStrictEqual('P2PKH')
      expect(regtest.constructor.name).toStrictEqual('P2PKH')
      expect(regtest.network).toStrictEqual(RegTest)
    })
  })

  describe('from() - invalid address', () => {
    it('should be able to validate in address prefix with network', () => {
      const invalid = DeFiAddress.from(p2pkhFixture.invalid)
      expect(invalid.valid).toBeFalsy()
    })

    it('invalid checksum', () => {
      const invalid = DeFiAddress.from(p2pkhFixture.invalidChecksum)
      expect(invalid.valid).toBeFalsy()
    })

    it('non DFI (network) address should be invalid', () => {
      const btc = DeFiAddress.from(p2pkhFixture.validBtcAddress)
      expect(btc.valid).toBeFalsy()
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
    it('should be able to build script', async () => {
      const p2pkh = DeFiAddress.from(p2pkhFixture.mainnet)
      const scriptStack = p2pkh.getScript()

      expect(scriptStack.stack.length).toStrictEqual(5)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_DUP)
      expect(scriptStack.stack[1]).toStrictEqual(OP_CODES.OP_HASH160)
      expect(scriptStack.stack[2].type).toStrictEqual('OP_PUSHDATA') // tested in `to()`
      expect(scriptStack.stack[3]).toStrictEqual(OP_CODES.OP_EQUALVERIFY)
      expect(scriptStack.stack[4]).toStrictEqual(OP_CODES.OP_CHECKSIG)
    })
  })

  describe('constructor()', () => {
    let validAddress: Address
    beforeAll(() => {
      validAddress = DeFiAddress.from(p2pkhFixture.mainnet)
      expect(validAddress.valid).toBeTruthy()
    })

    it('should not be able to instantiate `valid` address - with invalid address length', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new P2PKH(MainNet, validAddress.utf8String.slice(1), validAddress.buffer, true)
      }).toThrow('Invalid P2PKH address marked valid')
    })

    it('should not be able to instantiate `valid` address - with invalid buffer length', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new P2PKH(MainNet, validAddress.utf8String, (validAddress.buffer as Buffer).slice(1), true)
      }).toThrow('Invalid P2PKH address marked valid')
    })
  })
})
