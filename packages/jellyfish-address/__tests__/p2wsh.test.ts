import { MainNet, RegTest, TestNet } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { Address, DeFiAddress, P2WSH } from '../src'

describe('P2WSH', () => {
  const p2wshFixture = {
    mainnet: 'df1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsfkkf88', // built using jellyfish-transaction P2PSH test case example, no way to find back raw data using random address
    testnet: 'tf1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsemeex5',
    regtest: 'bcrt1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvssfsq3t',

    trimmedPrefix: 'f1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsfkkf88', // edited mainnet valid address, broken prefix
    invalid: 'df1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsfkkf8o', // edited mainnet address, letter 'o'
    validBtcAddress: 'bc1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsfkkf8o'
  }

  describe('from() - valid address', () => {
    it('should get the type precisely', () => {
      const p2sh = DeFiAddress.from(p2wshFixture.mainnet)
      expect(p2sh.valid).toBeTruthy()
      expect(p2sh.type).toStrictEqual('P2WSH')
      expect(p2sh.constructor.name).toStrictEqual('P2WSH')
      expect(p2sh.network).toStrictEqual(MainNet)
    })

    it('should work for all recognized network type', () => {
      const testnet = DeFiAddress.from(p2wshFixture.testnet)
      expect(testnet.valid).toBeTruthy()
      expect(testnet.type).toStrictEqual('P2WSH')
      expect(testnet.constructor.name).toStrictEqual('P2WSH')
      expect(testnet.network).toStrictEqual(TestNet)

      const regtest = DeFiAddress.from(p2wshFixture.regtest)
      expect(regtest.valid).toBeTruthy()
      expect(regtest.type).toStrictEqual('P2WSH')
      expect(regtest.constructor.name).toStrictEqual('P2WSH')
      expect(regtest.network).toStrictEqual(RegTest)
    })
  })

  describe('from() - invalid address', () => {
    it('trimmed prefix', () => {
      const invalid = DeFiAddress.from(p2wshFixture.trimmedPrefix)
      expect(invalid.valid).toBeFalsy()
    })

    it('invalid character set', () => {
      const invalid = DeFiAddress.from(p2wshFixture.invalid)
      expect(invalid.valid).toBeFalsy()
    })

    it('non DFI (network) address should be invalid', () => {
      const btc = DeFiAddress.from(p2wshFixture.validBtcAddress)
      expect(btc.valid).toBeFalsy()
    })
  })

  describe('to()', () => {
    it('should be able to build a new address using a script hash (32 bytes, 64 char hex string)', () => {
      const data = '9e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19' // 32 bytes
      expect(data.length).toStrictEqual(64)

      const p2wsh = P2WSH.to('regtest', data)
      expect(p2wsh.type).toStrictEqual('P2WSH')
      expect(p2wsh.valid).toBeTruthy()

      const scriptStack = p2wsh.getScript()
      expect(scriptStack.stack.length).toStrictEqual(2)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_0)
      expect(scriptStack.stack[1]).toStrictEqual(OP_CODES.OP_PUSHDATA_HEX_LE(data))
    })

    it('should reject invalid data - not 32 bytes data', () => {
      const pubKeyHash = '134b0749882c225e8647df3a3417507c6f5b27'
      expect(pubKeyHash.length).toStrictEqual(38)

      try {
        P2WSH.to('regtest', pubKeyHash)
        throw new Error('should had failed')
      } catch (e) {
        expect(e.message).toStrictEqual('InvalidScriptHashLength')
      }
    })
  })

  describe('getScript()', () => {
    it('should be able to build script', async () => {
      const p2wsh = DeFiAddress.from(p2wshFixture.mainnet)
      const scriptStack = p2wsh.getScript()

      expect(scriptStack.stack.length).toStrictEqual(2)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_0)
      expect(scriptStack.stack[1].type).toStrictEqual('OP_PUSHDATA')
    })
  })

  describe('constructor()', () => {
    let validAddress: Address

    beforeAll(() => {
      validAddress = DeFiAddress.from(p2wshFixture.mainnet)
      expect(validAddress.valid).toBeTruthy()
    })

    it('should not be able to instantiate `valid` address - with invalid buffer length', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new P2WSH(MainNet, validAddress.utf8String, (validAddress.buffer as Buffer).slice(1), true)
      }).toThrow('Invalid P2WSH address marked valid')
    })
  })
})
