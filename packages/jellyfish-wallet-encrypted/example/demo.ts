import { Transaction } from '@defichain/jellyfish-transaction/dist'
import { EncryptedMnemonicProvider, ScryptStorage, ScryptProvider, Storage, SimpleScryptsy } from '../src'

// Implementation of ScryptProvider depend on your platform, eg: react-native-scrypt
class MyScryptProvider implements ScryptProvider {
  passphraseToKey (passphrase: string, salt: Buffer, keyLength: number): Buffer {
    // eg: react-native
    // return require('react-native-scrypt')(passphrase, salt[, N=16384, r=8, p=8, dkLen=keyLength, encoding='legacy'])
    return new SimpleScryptsy().passphraseToKey(passphrase, salt, keyLength)
  }
}

// a persistent simple string storage (secured) on your platform
class MockSecuredStorage {
  // use secured storage on your platform, eg: https://github.com/oblador/react-native-keychain
  encryptedSeed: string | undefined
  seedHash: string | undefined
  async getter (key: 'data' | 'hash'): Promise<string|undefined> {
    return key === 'data' ? this.encryptedSeed : this.seedHash
  }

  async setter (key: 'data' | 'hash', data: string|undefined): Promise<void> {
    if (key === 'data') {
      this.encryptedSeed = data
    } else {
      this.seedHash = data
    }
  }
}

const mySecuredStorage = new MockSecuredStorage()
// create 2 string storages, for encrypted data and dSHA256(data) storing purpose
const encryptedSeedStorage: Storage = {
  getter: async (): Promise<string|undefined> => await mySecuredStorage.getter('data'),
  setter: async (value: string): Promise<void> => await mySecuredStorage.setter('data', value)
}
const seedHashStorage: Storage = {
  getter: async (): Promise<string|undefined> => await mySecuredStorage.getter('hash'),
  setter: async (value: string): Promise<void> => await mySecuredStorage.setter('hash', value)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class CreateMnemoniceWalletPage {
  state = {
    textInput: 'user input new desired passphrase'
  }

  async onConfirmCreateNewWallet (): Promise<void> {
    const mnemonic = this.randomMnemonicSeed()
    const provider = await EncryptedMnemonicProvider.create({
      scryptStorage: this.getScryptStorage(),
      passphrase: this.state.textInput, // to encrypt the seed
      seed: mnemonic.seed,
      options: {
        // this is DeFiChain testnet prefixes, they should be envvar decided config
        // find acceptable config from jellyfish-network
        bip32: {
          public: 0x043587cf,
          private: 0x04358394
        },
        wif: 0xef
      }
    })

    // once lost the in memory raw seed instance, use passphrase instead
    // const myMnemonicNode = await provider.unlockAndDerive("44'/1129'/0'/0/0", this.state.textInput)
    const myMnemonicNode = await provider.deriveWithSeed("44'/1129'/0'/0/0", mnemonic.seed)
    await myMnemonicNode.publicKey() // this can now be used for address derivation and receive fund

    console.log('Created new wallet, jot down your mnemonic phrases: ', mnemonic.words)
    console.log('Remember your passphrase: **********phrase, will be required to perform any transaction signing in future')
  }

  getScryptStorage (): ScryptStorage {
    return new ScryptStorage(
      new MyScryptProvider(),
      encryptedSeedStorage, // to store encrypted mnemonic seed
      seedHashStorage // to store mnemonic seed hash, for decryption result check
    )
  }

  randomMnemonicSeed (): { words: string, seed: Buffer } {
    return {
      // can use `jellyfish-wallet-mnemonic` `generateMnemonic()`
      words: '24 words to be kept by user',
      seed: Buffer.from('private key')
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class SignTransactionPage {
  state

  constructor (transaction: Transaction) {
    this.state = {
      transaction, // came from props
      textInput: 'user input passphrase'
    }
  }

  async onConfirmSignTransaction (): Promise<void> {
    const provider = await EncryptedMnemonicProvider.load({
      scryptStorage: this.getScryptStorage(),
      passphrase: this.state.textInput,
      options: {
        // this is DeFiChain testnet prefixes, they should be envvar decided config
        // find acceptable config from jellyfish-network
        bip32: {
          public: 0x043587cf,
          private: 0x04358394
        },
        wif: 0xef
      }
    })

    const myMnemonicNode = await provider.unlockAndDerive("44'/1129'/0'/0/0", this.state.textInput)
    const signedTx = await myMnemonicNode.signTx(this.state.textInput, this.state.transaction, [
      // utxos received by the address derived from this node with path = "44'/1129'/0'/0/0"
    ])
    console.log('Transaction signed and ready for broadcast', signedTx)
  }

  getScryptStorage (): ScryptStorage {
    return new ScryptStorage(
      new MyScryptProvider(),
      encryptedSeedStorage, // to store encrypted mnemonic seed
      seedHashStorage // to store mnemonic seed hash, for decryption result check
    )
  }
}
