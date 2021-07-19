import { OP_CODES, Script, Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
import { WalletEllipticPair } from './wallet_elliptic_pair'
import { Bech32, HASH160 } from '@defichain/jellyfish-crypto'
import { Network } from '@defichain/jellyfish-network'
import { DeFiAddress } from '@defichain/jellyfish-address'

/**
 * An HDW is organized as several 'accounts'.
 * Accounts are numbered, the default account ("") being number 0.
 * Account are derived from root and the pubkey to be used is `44'/1129'/${account}'/0/0`
 *
 * WalletAccount implementation uses NATIVE SEGWIT redeem script exclusively.
 */
export abstract class WalletAccount implements WalletEllipticPair {
  protected constructor (
    private readonly walletEllipticPair: WalletEllipticPair,
    public readonly network: Network
  ) {
  }

  /**
   * @return {Promise<string>} Bech32 address of this account. (NATIVE SEGWIT)
   */
  async getAddress (): Promise<string> {
    const pubKey = await this.walletEllipticPair.publicKey()
    return Bech32.fromPubKey(pubKey, this.network.bech32.hrp, 0x00)
  }

  /**
   * @return {Promise<Script>} redeem script of this account. (NATIVE SEGWIT)
   */
  async getScript (): Promise<Script> {
    const pubKey = await this.walletEllipticPair.publicKey()
    return {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(HASH160(pubKey), 'little')
      ]
    }
  }

  /**
   * Convert address to script, this validate that you are sending to the same network.
   * It uses jellyfish-address under the hood.
   *
   * @param {string} address to parse into script
   * @return {Script} parsed from address
   */
  addressToScript (address: string): Script {
    const parsed = DeFiAddress.from(this.network.name, address)
    return parsed.getScript()
  }

  /**
   * A WalletAccount is active when it has txn activity
   * @return Promise<boolean>
   */
  abstract isActive (): Promise<boolean>

  async publicKey (): Promise<Buffer> {
    return await this.walletEllipticPair.publicKey()
  }

  async privateKey (): Promise<Buffer> {
    return await this.walletEllipticPair.privateKey()
  }

  async sign (hash: Buffer): Promise<Buffer> {
    return await this.walletEllipticPair.sign(hash)
  }

  async signTx (transaction: Transaction, prevouts: Vout[]): Promise<TransactionSegWit> {
    return await this.walletEllipticPair.signTx(transaction, prevouts)
  }

  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    return await this.walletEllipticPair.verify(hash, derSignature)
  }
}

/**
 * WalletAccount uses a provider model to allow jellyfish-wallet provide an account interface from any upstream
 * provider. This keep WalletAccount implementation free from a single implementation constraint.
 */
export interface WalletAccountProvider<T extends WalletAccount> {

  /**
   * @param {WalletEllipticPair} hdNode of this wallet account
   * @return WalletAccount
   */
  provide: (hdNode: WalletEllipticPair) => T
}
