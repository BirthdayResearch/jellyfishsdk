import { Script } from '@defichain/jellyfish-transaction/src/tx'
import { Network } from '@defichain/jellyfish-network'
import { Base58Address } from '../src/Base58Address'

class DummyB58Address extends Base58Address {
  getScript (): Script {
    return {
      stack: []
    }
  }

  getPrefix (): number {
    return 0x12 // match the fixture p2pkh prefix
  }
}

describe('Base58Address', () => {
  const b58Fixture = {
    p2sh: 'dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf8', // prefix = 0x12
    p2pkh: '8JBuS81VT8ouPrT6YS55qoS74D13Cw7h1Y'
  }

  const dummyNetwork: Network = {
    name: 'regtest',
    bech32: {
      hrp: 'dummy'
    },
    bip32: {
      publicPrefix: 0x00000000,
      privatePrefix: 0x00000000
    },
    wifPrefix: 0x00,
    pubKeyHashPrefix: 0x00,
    scriptHashPrefix: 0x00,
    messagePrefix: '\x00Dummy Msg Prefix:\n'
  }

  const random20Bytes = '134b0749882c225e8647df3a3417507c6f5b2797'

  describe('extensible, should work for any defined network protocol', () => {
    it('fromAddress() - valid', () => {
      const valid = Base58Address.fromAddress<DummyB58Address>(dummyNetwork, b58Fixture.p2pkh, DummyB58Address)
      expect(valid.validate()).toBeTruthy()
    })

    it('fromAddress() - invalid charact set', () => {
      const invalid = Base58Address.fromAddress<DummyB58Address>(dummyNetwork, 'invalid b58 address', DummyB58Address)
      expect(invalid.validate()).toBeFalsy()
    })

    it('fromAddress() - invalid prefix', () => {
      const invalid = Base58Address.fromAddress<DummyB58Address>(dummyNetwork, b58Fixture.p2sh, DummyB58Address)
      expect(invalid.validate()).toBeFalsy()

      const valid = Base58Address.fromAddress<DummyB58Address>(dummyNetwork, b58Fixture.p2pkh, DummyB58Address)
      expect(valid.validate()).toBeTruthy()
    })

    it('to() - accept any 20 bytes hex string data', () => {
      const valid = Base58Address.to<DummyB58Address>(dummyNetwork, random20Bytes, DummyB58Address)
      expect(valid.getScript().stack).toEqual([])
    })

    it('to() - reject any non 20 bytes hex string data', () => {
      try {
        Base58Address.to<DummyB58Address>(dummyNetwork, random20Bytes.slice(1), DummyB58Address)
      } catch (e) {
        expect(e.message).toEqual('InvalidDataLength')
      }
    })
  })
})
