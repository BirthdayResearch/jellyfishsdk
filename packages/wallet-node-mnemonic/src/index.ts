import { HDNode } from '@defichain/wallet-core'
import bip39 from 'bip39'
// TODO(fuxingloh): bip39 wordlist
import bip32, { BIP32Interface } from 'bip32'

const HardenedBit = 0x80000000;

// TODO(fuxingloh):
// mnemonicToSeed
// mnemonicToEntropy
// isValidMnemonic

export const defaultPath = "m/44'/1129'/0'/0/0";

type Network = 'main' | 'test' | 'regtest'

interface Bip32Network {
  bip32: {
    public: number
    private: number
  }
  wif: number
}

function getBip32Network (network: Network): Bip32Network {
  switch (network) {
    case "main":
    case "test":
    case "regtest":
    // TODO(fuxingloh): return {}
  }

  return {
    bip32: {
      public: 0x0488b21e,
      private: 0x0488ade4,
    },
    wif: 0x80
  }
}

/**
 *
 */
// export class MnemonicWallet extends Wallet {
//
//   private readonly wallet: BIP32Interface
//
//   static validate (mnemonic: string): boolean {
//     return bip39.validateMnemonic(mnemonic)
//   }
//
//   static generate (): string {
//     return bip39.generateMnemonic(24)
//   }
//
//   constructor (mnemonic: string, network: Network) {
//     super();
//     const seed: Buffer = bip39.mnemonicToSeedSync(mnemonic)
//     this.wallet = bip32.fromSeed(seed, getBip32Network(network))
//   }
//
//   getWIF () {
//     return this.wallet.toWIF()
//   }
//
//   derivePath (path: string) {
//     return this.wallet.derivePath(path)
//   }
//
//   getAddress () {
//
//   }
//
//   getBalance () {
//
//   }
// }
