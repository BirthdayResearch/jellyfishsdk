/**
 * No DefinitelyTyped declarations found, declaring our own here.
 * For ./aes256 package to work without crypto.
 * @warning this is bare minimum, not fully typed as native crypto package.
 */

declare module 'browserify-aes' {
  interface Cipher {
    update: (data: Buffer) => Buffer
    final: () => Buffer
  }
  interface Decipher extends Cipher {}

  export function createCipheriv (algorithm: string, password: Buffer, iv: Buffer): Cipher
  export function createDecipheriv (algorithm: string, password: Buffer, iv: Buffer): Decipher
}
