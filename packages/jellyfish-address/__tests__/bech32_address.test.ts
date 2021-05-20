import { Script } from '@defichain/jellyfish-transaction'
import { Network } from '@defichain/jellyfish-network'
import { Bech32Address } from '../src'

class DummyBech32Address extends Bech32Address {
  getScript (): Script {
    return {
      stack: []
    }
  }
}

describe('Bech32Address', () => {
  const bech32Fixture = {
    p2wpkh: 'dummy1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpv', // edited prefix to match test network
    invalidPrefix: 'prefix1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpv', // original p2wpkh address sample
    invalidCharset: 'dummy1qpe7q4vvtxpdunpazvmwqdh3xlnatfdt2xr8mpo' // character 'o'
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
  } as any

  describe('extensible, should work for any defined network protocol', () => {
    it('fromAddress() - valid', () => {
      const valid = Bech32Address.fromAddress<DummyBech32Address>(dummyNetwork, bech32Fixture.p2wpkh, DummyBech32Address)
      expect(valid.validate()).toBeTruthy()
    })

    it('fromAddress() - invalid character set', () => {
      const invalid = Bech32Address.fromAddress<DummyBech32Address>(dummyNetwork, bech32Fixture.invalidCharset, DummyBech32Address)
      expect(invalid.validate()).toBeFalsy()
    })

    it('fromAddress() - invalid prefix', () => {
      const invalid = Bech32Address.fromAddress<DummyBech32Address>(dummyNetwork, bech32Fixture.invalidPrefix, DummyBech32Address)
      expect(invalid.validate()).toBeFalsy()
    })
  })
})
