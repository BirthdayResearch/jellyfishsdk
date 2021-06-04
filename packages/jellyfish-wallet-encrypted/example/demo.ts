import { Transaction } from '@defichain/jellyfish-transaction/dist'
import { EncryptedMnemonicProvider, ScryptStorage, ScryptProvider, Storage, SimpleScryptsy } from '../src'

// Implementation of ScryptProvider depend on your platform, eg: react-native-scrypt
// if npm package `scryptsy` available on your platform, can use `SimpleScryptsy` direct
class MyScryptProvider implements ScryptProvider {
  passphraseToKey (passphrase: string, salt: Buffer, keyLength: number): Buffer {
    return new SimpleScryptsy().passphraseToKey(passphrase, salt, keyLength)
  }
}

class MockSecuredStorage implements Storage {
  // use secured storage on your platform, eg: https://github.com/oblador/react-native-keychain
  inMemory: string | undefined
  async getter (): Promise<string|undefined> {
    return this.inMemory
  }

  async setter (data: string|undefined): Promise<void> {
    this.inMemory = data
  }
}
// create 2 string storages, for encrypted data and dSHA256(data) storing purpose
const mySecuredStorage = new MockSecuredStorage()
const mySecuredStorage2 = new MockSecuredStorage()

// eslint-disable-next-line
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
        bip32: {
          public: 0x00000000,
          private: 0x00000000
        },
        wif: 0x00
      }
    })

    const myMnemonicNode = await provider.unlockAndDerive("44'/1129'/0'/0/0", this.state.textInput)
    await myMnemonicNode.publicKey() // this can now be used for address derivation and receive fund

    console.log('Created new wallet, jot down your mnemonic phrases: ', mnemonic.words)
    console.log('Remember your passphrase: **********phrase, will be required to perform any transaction signing in future')
  }

  getScryptStorage (): ScryptStorage {
    return new ScryptStorage(
      new MyScryptProvider(),
      mySecuredStorage, // to store encrypted mnemonic seed
      mySecuredStorage2 // to store mnemonic seed hash, for decryption result check
    )
  }

  randomMnemonicSeed (): { words: string, seed: Buffer } {
    return {
      words: '24 words to be kept by user',
      seed: Buffer.from('private key')
    }
  }
}

// eslint-disable-next-line
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
        bip32: {
          public: 0x00000000,
          private: 0x00000000
        },
        wif: 0x00
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
      mySecuredStorage, // to store encrypted mnemonic seed
      mySecuredStorage2 // to store mnemonic seed hash, for decryption result check
    )
  }
}
