import { Wallet } from '@defichain/wallet-core'
import bip39 from 'bip39'
import bip32 from 'bip32'

type Network = 'main' | 'test' | 'regtest'

function getBip32Network(network: Network) {
  switch (network) {
    case "main":
    case "test":
    case "regtest":
      // TODO(fuxingloh): return {}
  }
}

// const BITCOIN = {
//     messagePrefix: '\x18Bitcoin Signed Message:\n',
//     bech32: 'bc',
//     bip32: {
//         public: 0x0488b21e, // mainnet public
//         private: 0x0488ade4, // mainnet private
//     },
//     pubKeyHash: 0x00,
//     scriptHash: 0x05,
//     wif: 0x80, // wallet import format
// };

export class MnemonicWallet extends Wallet {

  static validate (mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic)
  }

  static generate (): string {
    return bip39.generateMnemonic(24)
  }

  constructor (mnemonic: string, network: Network) {
    super();
    const seed: Buffer = bip39.mnemonicToSeedSync(mnemonic)
    bip32.fromSeed(seed)
  }

  getAddress () {

  }

  getBalance () {

  }

  //   createRoot = (seed: Buffer, network: any) => {
  //     return bip32.fromSeed(seed, network);
  //   };
  //
  //   getRootPrivateKey = (root: any) => {
  //     return root.privateKey.toString('hex');
  //   };
  //
  //   getRootPublicKey = (root: any) => {
  //     return root.publicKey.toString('hex');
  //   };
  //
  //   getPrivateKeyInWIF = (root: any) => {
  //     return root.toWIF();
  //   };
}
