import * as bip39 from 'bip39'

/**
 * @param {string} mnemonic sentence to validate
 * @return {boolean} validity
 */
export function validateMnemonicSentence (mnemonic: string | string[]): boolean {
  if (Array.isArray(mnemonic)) {
    return bip39.validateMnemonic(mnemonic.join(' '))
  }
  return bip39.validateMnemonic(mnemonic)
}

/**
 * @param {string} word to check if exist in mnemonic english word list
 * @return {boolean} validity
 */
export function validateMnemonicWord (word: string): boolean {
  return bip39.wordlists.english.includes(word)
}

/**
 * Generate a random mnemonic code of length, uses crypto.randomBytes under the hood.
 * Defaults to 256-bits of entropy.
 * https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
 *
 * |  ENT  | CS | ENT+CS |  MS  |
 * +-------+----+--------+------+
 * |  128  |  4 |   132  |  12  |
 * |  160  |  5 |   165  |  15  |
 * |  192  |  6 |   198  |  18  |
 * |  224  |  7 |   231  |  21  |
 * |  256  |  8 |   264  |  24  |
 *
 * @param {number} length the sentence length of the mnemonic code
 * @param {(number) => Buffer} rng random number generation, generate random num of bytes buffer
 * @return {string[]} generated mnemonic word list, (COLD STORAGE)
 */
export function generateMnemonic (length: 12 | 15 | 18 | 21 | 24 = 24, rng?: (numOfBytes: number) => Buffer): string[] {
  const entropy = length / 3 * 32
  const sentence = bip39.generateMnemonic(entropy, rng)
  return sentence.split(' ')
}

/**
 * @param {string[]} mnemonic words, (COLD)
 * @return {Buffer} HD seed, (HOT) but ideally should not be kept at rest
 */
export function mnemonicToSeed (mnemonic: string[]): Buffer {
  return bip39.mnemonicToSeedSync(mnemonic.join(' '))
}
