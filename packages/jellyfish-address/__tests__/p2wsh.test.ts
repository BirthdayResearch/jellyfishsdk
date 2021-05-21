import { MainNet, RegTest, TestNet } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { DeFiAddress, P2WSH } from '../src'

describe('P2WSH', () => {
  const p2wshFixture = {
    mainnet: 'df1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsfkkf88', // built using jellyfish-transaction P2PSH test case example, no way to find back raw data using random address
    testnet: 'tf1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsemeex5',
    regtest: 'bcrt1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvssfsq3t',

    trimmedPrefix: 'f1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsfkkf88', // edited mainnet valid address, broken prefix
    invalid: 'df1qncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvsfkkf8o' // edited mainnet address, letter 'o'
  }

  describe('from() - valid address', () => {
    it('should get the type precisely', () => {
      const p2sh = DeFiAddress.from('mainnet', p2wshFixture.mainnet)
      expect(p2sh.valid).toBeTruthy()
      expect(p2sh.type).toStrictEqual('P2WSH')
      expect(p2sh.constructor.name).toStrictEqual('P2WSH')
      expect(p2sh.network).toStrictEqual(MainNet)
    })

    it('should work for all recognized network type', () => {
      const testnet = DeFiAddress.from('testnet', p2wshFixture.testnet)
      expect(testnet.valid).toBeTruthy()
      expect(testnet.type).toStrictEqual('P2WSH')
      expect(testnet.constructor.name).toStrictEqual('P2WSH')
      expect(testnet.network).toStrictEqual(TestNet)

      const regtest = DeFiAddress.from('regtest', p2wshFixture.regtest)
      expect(regtest.valid).toBeTruthy()
      expect(regtest.type).toStrictEqual('P2WSH')
      expect(regtest.constructor.name).toStrictEqual('P2WSH')
      expect(regtest.network).toStrictEqual(RegTest)
    })
  })

  describe('from() - invalid address', () => {
    it('trimmed prefix', () => {
      const invalid = DeFiAddress.from('mainnet', p2wshFixture.trimmedPrefix)
      expect(invalid.valid).toBeFalsy()
    })

    it('invalid character set', () => {
      const invalid = DeFiAddress.from('mainnet', p2wshFixture.invalid)
      expect(invalid.valid).toBeFalsy()
    })

    it('should be able to validate in address prefix with network', () => {
      // valid address, used on different network
      const p2sh = DeFiAddress.from('testnet', p2wshFixture.mainnet)
      expect(p2sh.valid).toBeFalsy()
      // expect(p2sh.type).toStrictEqual('P2WSH') // invalid address guessed type is not promising, as p2wsh and p2sh are versy similar
      expect(p2sh.network).toStrictEqual(TestNet)
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
    it('should refuse to build ops code stack for invalid address', () => {
      const invalid = DeFiAddress.from('testnet', p2wshFixture.mainnet)
      expect(invalid.valid).toBeFalsy()
      try {
        invalid.getScript()
      } catch (e) {
        expect(e.message).toStrictEqual('InvalidDefiAddress')
      }
    })

    it('should be able to build script', async () => {
      const p2wsh = DeFiAddress.from('mainnet', p2wshFixture.mainnet)
      const scriptStack = p2wsh.getScript()

      expect(scriptStack.stack.length).toStrictEqual(2)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_0)
      expect(scriptStack.stack[1].type).toStrictEqual('OP_PUSHDATA')
    })
  })

  it('validate()', () => {
    const data = '9e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19' // 32 bytes

    const p2wsh = new P2WSH(RegTest, p2wshFixture.regtest, data)
    expect(p2wsh.validatorPassed).toStrictEqual(0)
    expect(p2wsh.valid).toBeFalsy()

    const isValid = p2wsh.validate()
    // expect(p2wsh.validatorPassed).toStrictEqual(4) // length, network prefix, data character set
    expect(isValid).toBeTruthy()
  })

  it('guess()', () => {
    const p2wsh = DeFiAddress.guess(p2wshFixture.mainnet)
    expect(p2wsh.valid).toBeTruthy()
    expect(p2wsh.type).toStrictEqual('P2WSH')
    expect(p2wsh.constructor.name).toStrictEqual('P2WSH')
    expect(p2wsh.network).toStrictEqual(MainNet)
  })
})
