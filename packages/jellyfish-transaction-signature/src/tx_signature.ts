import { dSHA256, HASH160 } from '@defichain/jellyfish-crypto'
import { SmartBuffer } from 'smart-buffer'
import {
  CVoutV4,
  CWitnessProgram,
  DeFiTransactionConstants,
  OP_CODES,
  OP_PUSHDATA,
  Script,
  SIGHASH,
  Transaction,
  TransactionSegWit,
  Vin,
  Vout,
  Witness,
  WitnessProgram
} from '@defichain/jellyfish-transaction'

export interface SignInputOption {
  /**
   * Prevout of this input
   */
  prevout: Vout
  /**
   * @return {Promise<Buffer>} compressed public key
   */
  publicKey: () => Promise<Buffer>
  /**
   * @param {Buffer} hash to sign
   * @return {Buffer} signature in DER format, SIGHASHTYPE not included
   * @see https://tools.ietf.org/html/rfc6979
   * @see https://github.com/bitcoin/bitcoin/pull/13666
   */
  sign: (hash: Buffer) => Promise<Buffer>
  /**
   * Optionally provide a witness script,
   * or it will be guessed if it can be guessed.
   */
  witnessScript?: Script
}

export interface SignOption {
  sigHashType?: SIGHASH
  validate?: {
    version?: boolean
    lockTime?: boolean
  }
}

function hashPrevouts (transaction: Transaction, sigHashType: SIGHASH): string {
  if (sigHashType !== SIGHASH.ALL) {
    throw new Error('currently only SIGHASH.ALL is supported')
  }

  const buffer = new SmartBuffer()
  for (const vin of transaction.vin) {
    const txid = Buffer.from(vin.txid, 'hex').reverse()
    buffer.writeBuffer(txid)
    buffer.writeUInt32LE(vin.index)
  }
  return dSHA256(buffer.toBuffer()).toString('hex')
}

function hashSequence (transaction: Transaction, sigHashType: SIGHASH): string {
  if (sigHashType !== SIGHASH.ALL) {
    throw new Error('currently only SIGHASH.ALL is supported')
  }

  const buffer = new SmartBuffer()
  for (const vin of transaction.vin) {
    buffer.writeUInt32LE(vin.sequence)
  }
  return dSHA256(buffer.toBuffer()).toString('hex')
}

function hashOutputs (transaction: Transaction, sigHashType: SIGHASH): string {
  if (sigHashType !== SIGHASH.ALL) {
    throw new Error('currently only SIGHASH.ALL is supported')
  }

  const buffer = new SmartBuffer()
  transaction.vout.forEach(vout => (new CVoutV4(vout)).toBuffer(buffer))
  return dSHA256(buffer.toBuffer()).toString('hex')
}

/**
 *
 * The witness must consist of exactly 2 items.
 * The '0' in scriptPubKey indicates the following push is a version 0 witness program.
 * The length of 20 indicates that it is a P2WPKH type.
 *
 * @param {SignInputOption} signInputOption to check is is V0 P2WPKH
 */
async function isV0P2WPKH (signInputOption: SignInputOption): Promise<boolean> {
  const stack = signInputOption.prevout.script.stack

  if (stack.length !== 2) return false
  if (stack[0].type !== 'OP_0') return false
  if (stack[1].type !== 'OP_PUSHDATA') return false
  if ((stack[1] as OP_PUSHDATA).length() !== 20) return false

  const pubkey: Buffer = await signInputOption.publicKey()
  const pubkeyHashHex = HASH160(pubkey).toString('hex')
  const pushDataHex = (stack[1] as OP_PUSHDATA).hex

  if (pubkeyHashHex === pushDataHex) {
    return true
  }

  throw new Error('invalid input option - attempting to sign a mismatch vout and publicKey is not allowed')
}

/**
 * If script is not provided, it needs to be guessed
 *
 * @param {Vin} vin of the script
 * @param {SignInputOption} signInputOption to sign the vin
 */
async function getScriptCode (vin: Vin, signInputOption: SignInputOption): Promise<Script> {
  if (signInputOption.witnessScript !== undefined) {
    return signInputOption.witnessScript
  }

  if (await isV0P2WPKH(signInputOption)) {
    const pubkey: Buffer = await signInputOption.publicKey()
    const pubkeyHash = HASH160(pubkey)

    return {
      stack: [
        OP_CODES.OP_DUP,
        OP_CODES.OP_HASH160,
        OP_CODES.OP_PUSHDATA(pubkeyHash, 'little'),
        OP_CODES.OP_EQUALVERIFY,
        OP_CODES.OP_CHECKSIG
      ]
    }
  }

  throw new Error('witnessScript required, only P2WPKH can be guessed')
}

async function asWitnessProgram (transaction: Transaction, vin: Vin, signInputOption: SignInputOption, sigHashType: SIGHASH): Promise<WitnessProgram> {
  return {
    version: transaction.version,
    hashPrevouts: hashPrevouts(transaction, sigHashType),
    hashSequence: hashSequence(transaction, sigHashType),
    outpointTxId: vin.txid,
    outpointIndex: vin.index,
    scriptCode: await getScriptCode(vin, signInputOption),
    value: signInputOption.prevout.value,
    sequence: vin.sequence,
    hashOutputs: hashOutputs(transaction, sigHashType),
    lockTime: transaction.lockTime,
    hashType: sigHashType
  }
}

/**
 * TransactionSigner
 * 1. you can sign an unsigned transaction and get a signed transaction.
 * 2. you can sign a vin and get a witness in tx for that vin
 *
 * https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki
 * https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki
 * https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
 */
export const TransactionSigner = {

  /**
   * @param {Transaction} transaction to sign
   * @param {number} index of the vin to sign
   * @param {SignInputOption} option input option
   * @param {SIGHASH} sigHashType SIGHASH type
   */
  async signInput (transaction: Transaction, index: number, option: SignInputOption, sigHashType: SIGHASH = SIGHASH.ALL): Promise<Witness> {
    const vin = transaction.vin[index]
    const program = await asWitnessProgram(transaction, vin, option, sigHashType)
    const preimage = new CWitnessProgram(program).asBuffer()
    const sigHash = dSHA256(preimage)
    const derSignature = await option.sign(sigHash)
    const sigHashBuffer = Buffer.alloc(1, sigHashType)

    // signature + pubKey
    const signature = Buffer.concat([derSignature, Buffer.alloc(1, sigHashBuffer)])
    const pubkey: Buffer = await option.publicKey()
    return {
      scripts: [
        {
          hex: signature.toString('hex')
        },
        {
          hex: pubkey.toString('hex')
        }
      ]
    }
  },

  async sign (transaction: Transaction, inputOptions: SignInputOption[], option: SignOption = {}): Promise<TransactionSegWit> {
    TransactionSigner.validate(transaction, inputOptions, option)

    const { sigHashType = SIGHASH.ALL } = option

    const witnesses: Witness[] = []
    for (let i = 0; i < transaction.vin.length; i++) {
      const witness = await this.signInput(transaction, i, inputOptions[i], sigHashType)
      witnesses.push(witness)
    }

    return {
      version: transaction.version,
      marker: DeFiTransactionConstants.WitnessMarker,
      flag: DeFiTransactionConstants.WitnessFlag,
      vin: transaction.vin,
      vout: transaction.vout,
      witness: witnesses,
      lockTime: transaction.lockTime
    }
  },

  validate (transaction: Transaction, inputOptions: SignInputOption[], option: SignOption) {
    const { version = true, lockTime = true } = (option.validate !== undefined) ? option.validate : {}

    if (transaction.vin.length === 0) {
      throw new Error('vin.length = 0 - attempting to sign transaction without vin is not allowed')
    }

    if (transaction.vin.length !== inputOptions.length) {
      throw new Error('vin.length and inputOptions.length must match')
    }

    if (version && transaction.version !== DeFiTransactionConstants.Version) {
      throw new Error(`option.validate.version = true - trying to sign a txn ${transaction.version} different from ${DeFiTransactionConstants.Version} is not supported`)
    }

    if (lockTime && transaction.lockTime !== 0) {
      throw new Error(`option.validate.lockTime = true - lockTime: ${transaction.lockTime} must be zero`)
    }
  }
}
