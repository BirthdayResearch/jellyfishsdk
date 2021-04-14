declare module 'bip66' {
  export function check (buffer: Buffer): boolean

  export function decode (buffer: Buffer): { r: Buffer, s: Buffer }

  export function encode (r: Buffer, s: Buffer): Buffer
}
