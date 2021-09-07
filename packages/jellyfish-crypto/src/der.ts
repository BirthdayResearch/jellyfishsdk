import bip66 from 'bip66'

/**
 * Distinguished Encoding Rules (DER) Signatures
 *
 * The MIT License (MIT)
 * Copyright (c) 2011-2020 bitcoinjs-lib contributors
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki
 * @see https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/script_signature.ts
 */
export const DERSignature = {
  /**
   * @param signature to encode into DER Signature
   */
  encode (signature: Buffer): Buffer {
    const r = DER.to(signature.slice(0, 32))
    const s = DER.to(signature.slice(32, 64))
    return bip66.encode(r, s)
  },
  /**
   * @param derSignature to decode
   */
  decode (derSignature: Buffer): Buffer {
    const { r, s } = bip66.decode(derSignature)
    return Buffer.concat([
      DER.from(r),
      DER.from(s)
    ], 64)
  }
}

const DER = {
  to (buffer: Buffer): Buffer {
    let i = 0
    while (buffer[i] === 0) {
      ++i
    }

    if (i === buffer.length) {
      return Buffer.alloc(1, 0)
    }

    buffer = buffer.slice(i)
    if ((buffer[0] & 0x80) !== 0) {
      return Buffer.concat([
        Buffer.alloc(1, 0),
        buffer
      ], 1 + buffer.length)
    }
    return buffer
  },

  from (der: Buffer): Buffer {
    if (der[0] === 0x00) {
      der = der.slice(1)
    }

    const buffer = Buffer.alloc(32, 0)
    const copyStart = Math.max(0, 32 - der.length)
    der.copy(buffer, copyStart)
    return buffer
  }
}
