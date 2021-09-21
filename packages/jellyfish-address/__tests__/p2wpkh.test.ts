import { MainNet, NetworkName, RegTest, TestNet } from '@defichain/jellyfish-network'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { DeFiAddress, fromScript, fromScriptHex, fromScriptP2WPKH, P2WPKH } from '../src'
import { Testing } from '@defichain/jellyfish-testing'
import { wallet } from '@defichain/jellyfish-api-core'
import { HASH160 } from '@defichain/jellyfish-crypto'

describe('P2WPKH', () => {
  const container = new RegTestContainer()
  const p2wpkhFixture = {
    mainnet: 'df1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpv',
    testnet: 'tf1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt24nagpg',
    regtest: '',

    trimmedPrefix: 'f1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpv', // edited mainnet address with broken prefix
    invalid: 'df1pe7q4vvtxpdunpazvmwqdh3xlnatfdt2ncrpqo' // edited mainnet address, letter 'o'
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    p2wpkhFixture.regtest = await container.getNewAddress('', 'bech32')
  })

  afterAll(async () => await container.stop())

  describe('from() - valid address', () => {
    it('should get the type precisely', () => {
      const p2wpkh = DeFiAddress.from('mainnet', p2wpkhFixture.mainnet)
      expect(p2wpkh.valid).toBeTruthy()
      expect(p2wpkh.type).toStrictEqual('P2WPKH')
      expect(p2wpkh.constructor.name).toStrictEqual('P2WPKH')
      expect(p2wpkh.network).toStrictEqual(MainNet)
    })

    it('should work for all recognized network type', () => {
      const testnet = DeFiAddress.from('testnet', p2wpkhFixture.testnet)
      expect(testnet.valid).toBeTruthy()
      expect(testnet.type).toStrictEqual('P2WPKH')
      expect(testnet.constructor.name).toStrictEqual('P2WPKH')
      expect(testnet.network).toStrictEqual(TestNet)

      const regtest = DeFiAddress.from('regtest', p2wpkhFixture.regtest)
      expect(regtest.valid).toBeTruthy()
      expect(regtest.type).toStrictEqual('P2WPKH')
      expect(regtest.constructor.name).toStrictEqual('P2WPKH')
      expect(regtest.network).toStrictEqual(RegTest)
    })
  })

  describe('from() - invalid address', () => {
    it('trimmed prefix', () => {
      const invalid = DeFiAddress.from('mainnet', p2wpkhFixture.trimmedPrefix)
      expect(invalid.valid).toBeFalsy()
    })

    it('invalid character set', () => {
      const invalid = DeFiAddress.from('mainnet', p2wpkhFixture.invalid)
      expect(invalid.valid).toBeFalsy()
    })

    it('should be able to validate in address prefix with network', () => {
      // valid address, used on different network
      const p2wpkh = DeFiAddress.from('testnet', p2wpkhFixture.mainnet)
      expect(p2wpkh.valid).toBeFalsy()
      // expect(p2wpkh.type).toStrictEqual('P2WPKH') // invalid address guessed type is not promising, as p2wpkh and p2wpkh are versy similar
      expect(p2wpkh.network).toStrictEqual(TestNet)
    })
  })

  describe('to()', () => {
    it('should be able to build a new address using a public key hash (20 bytes, 40 char hex string)', () => {
      const data = '0e7c0ab18b305bc987a266dc06de26fcfab4b56a' // 20 bytes
      expect(data.length).toStrictEqual(40)

      const p2wpkh = P2WPKH.to('regtest', data)
      expect(p2wpkh.type).toStrictEqual('P2WPKH')
      expect(p2wpkh.valid).toBeTruthy()

      const scriptStack = p2wpkh.getScript()
      expect(scriptStack.stack.length).toStrictEqual(2)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_0)
      expect(scriptStack.stack[1]).toStrictEqual(OP_CODES.OP_PUSHDATA_HEX_LE(data))
    })

    it('should reject invalid data - not 32 bytes data', () => {
      const pubKeyHash = '9e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19'
      expect(pubKeyHash.length).toStrictEqual(64) // testing with a p2wpkh data

      try {
        P2WPKH.to('regtest', pubKeyHash)
        throw new Error('should had failed')
      } catch (e) {
        expect(e.message).toStrictEqual('InvalidPubKeyHashLength')
      }
    })
  })

  describe('getScript()', () => {
    it('should refuse to build ops code stack for invalid address', () => {
      const invalid = DeFiAddress.from('testnet', p2wpkhFixture.mainnet)
      expect(invalid.valid).toBeFalsy()
      try {
        invalid.getScript()
      } catch (e) {
        expect(e.message).toStrictEqual('InvalidDefiAddress')
      }
    })

    it('should be able to build script', async () => {
      const p2wpkh = DeFiAddress.from('mainnet', p2wpkhFixture.mainnet)
      const scriptStack = p2wpkh.getScript()

      expect(scriptStack.stack.length).toStrictEqual(2)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_0)
      expect(scriptStack.stack[1].type).toStrictEqual('OP_PUSHDATA')
    })
  })

  it('validate()', () => {
    const data = '0e7c0ab18b305bc987a266dc06de26fcfab4b56a' // 20 bytes

    const p2wpkh = new P2WPKH(RegTest, p2wpkhFixture.regtest, data)
    expect(p2wpkh.validatorPassed).toStrictEqual(0)
    expect(p2wpkh.valid).toBeFalsy()

    const isValid = p2wpkh.validate()
    expect(p2wpkh.validatorPassed).toStrictEqual(5) // length, network prefix, data character set
    expect(isValid).toBeTruthy()
  })

  it('guess()', () => {
    const p2wpkh = DeFiAddress.guess(p2wpkhFixture.mainnet)
    expect(p2wpkh.valid).toBeTruthy()
    expect(p2wpkh.type).toStrictEqual('P2WPKH')
    expect(p2wpkh.constructor.name).toStrictEqual('P2WPKH')
    expect(p2wpkh.network).toStrictEqual(MainNet)
  })
})

describe('with regtest container', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should generate address as with defid', async () => {
    const address = await testing.rpc.wallet.getNewAddress('', wallet.AddressType.BECH32)
    const info = await testing.rpc.wallet.getAddressInfo(address)

    const script: Script = {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(HASH160(Buffer.from(info.pubkey, 'hex')), 'little')
      ]
    }

    expect(fromScript(script, 'regtest')).toStrictEqual(address)
    expect(fromScriptHex(info.scriptPubKey, 'regtest')).toStrictEqual(address)
    expect(fromScriptP2WPKH(script, 'regtest')).toStrictEqual(address)
  })
})

it('should convert from Script', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('0e7c0ab18b305bc987a266dc06de26fcfab4b56a')
    ]
  }

  {
    const address = fromScriptP2WPKH(script, 'mainnet')
    expect(address).toStrictEqual('df1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpv')
  }

  {
    const address = fromScriptP2WPKH(script, 'testnet')
    expect(address).toStrictEqual('tf1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt24nagpg')
  }

  {
    const address = fromScriptP2WPKH(script, 'regtest')
    expect(address).toStrictEqual('bcrt1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xghtpf')
  }
})

it('should fail to convert from script, if length != 2', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('0e7c0ab18b305bc987a266dc06de26fcfab4b56a'),
      OP_CODES.OP_EQUALVERIFY
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2WPKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [0] != OP_0', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_10,
      OP_CODES.OP_PUSHDATA_HEX_LE('0e7c0ab18b305bc987a266dc06de26fcfab4b56a')
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2WPKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [1] != OP_PUSHDATA', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_1,
      OP_CODES.OP_RETURN
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2WPKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})

it('should fail to convert from script, if [1].length != 20', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_1,
      OP_CODES.OP_PUSHDATA_HEX_LE('0e7c0ab18b305bc987a266dc06de26fcfab4b56a00')
    ]
  }

  for (const network of Array.of<NetworkName>('mainnet', 'testnet', 'regtest')) {
    expect(fromScriptP2WPKH(script, network)).toBeUndefined()
    expect(fromScript(script, network)).toBeUndefined()
  }
})
