import { MainNet, RegTest, TestNet } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { RegTestContainer } from '@defichain/testcontainers'
import { Address, DeFiAddress, P2WPKH } from '../src'

describe('P2WPKH', () => {
  const container = new RegTestContainer()
  const p2wpkhFixture = {
    mainnet: 'df1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpv',
    testnet: 'tf1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt24nagpg',
    regtest: '',

    trimmedPrefix: 'f1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpv', // edited mainnet address with broken prefix
    invalid: 'df1pe7q4vvtxpdunpazvmwqdh3xlnatfdt2ncrpqo', // edited mainnet address, letter 'o'
    validBtcAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' // valid btc p2wph
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    p2wpkhFixture.regtest = await container.getNewAddress('', 'bech32')
  })

  afterAll(async () => await container.stop())

  describe('from() - valid address', () => {
    it('should get the type precisely', () => {
      const p2wpkh = DeFiAddress.from(p2wpkhFixture.mainnet)
      expect(p2wpkh.valid).toBeTruthy()
      expect(p2wpkh.type).toStrictEqual('P2WPKH')
      expect(p2wpkh.constructor.name).toStrictEqual('P2WPKH')
      expect(p2wpkh.network).toStrictEqual(MainNet)
    })

    it('should work for all recognized network type', () => {
      const testnet = DeFiAddress.from(p2wpkhFixture.testnet)
      expect(testnet.valid).toBeTruthy()
      expect(testnet.type).toStrictEqual('P2WPKH')
      expect(testnet.constructor.name).toStrictEqual('P2WPKH')
      expect(testnet.network).toStrictEqual(TestNet)

      const regtest = DeFiAddress.from(p2wpkhFixture.regtest)
      expect(regtest.valid).toBeTruthy()
      expect(regtest.type).toStrictEqual('P2WPKH')
      expect(regtest.constructor.name).toStrictEqual('P2WPKH')
      expect(regtest.network).toStrictEqual(RegTest)
    })
  })

  describe('from() - invalid address', () => {
    it('trimmed prefix', () => {
      const invalid = DeFiAddress.from(p2wpkhFixture.trimmedPrefix)
      expect(invalid.valid).toBeFalsy()
    })

    it('invalid character set', () => {
      const invalid = DeFiAddress.from(p2wpkhFixture.invalid)
      expect(invalid.valid).toBeFalsy()
    })

    it('non DFI (network) address should be invalid', () => {
      const btc = DeFiAddress.from(p2wpkhFixture.validBtcAddress)
      expect(btc.valid).toBeFalsy()
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
    it('should be able to build script', async () => {
      const p2wpkh = DeFiAddress.from(p2wpkhFixture.mainnet)
      const scriptStack = p2wpkh.getScript()

      expect(scriptStack.stack.length).toStrictEqual(2)
      expect(scriptStack.stack[0]).toStrictEqual(OP_CODES.OP_0)
      expect(scriptStack.stack[1].type).toStrictEqual('OP_PUSHDATA')
    })
  })

  describe('constructor()', () => {
    let validAddress: Address

    beforeAll(() => {
      validAddress = DeFiAddress.from(p2wpkhFixture.mainnet)
      expect(validAddress.valid).toBeTruthy()
    })
    it('should not be able to instantiate `valid` address - without network', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new P2WPKH(undefined, validAddress.utf8String, validAddress.buffer, true)
      }).toThrow('Invalid P2WPKH address marked valid')
    })

    it('should not be able to instantiate `valid` address - with invalid buffer length', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new P2WPKH(MainNet, validAddress.utf8String, (validAddress.buffer as Buffer).slice(1), true)
      }).toThrow('Invalid P2WPKH address marked valid')
    })
  })
})
