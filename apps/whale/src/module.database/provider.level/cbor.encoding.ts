import { CodecEncoder } from 'level-codec'
import cbor from 'cbor'

/**
 * Faster & Smaller Value Codec for level.database.ts
 * About 25% reduction based on the written test in cbor.encoding.spec.ts
 *
 * @see http://cbor.io/
 * @see https://github.com/hildjj/node-cbor
 */
export const CborEncoding: CodecEncoder = {
  encode (val: any): any {
    return cbor.encode(val)
  },
  decode (val: any): any {
    return cbor.decode(val)
  },
  buffer: true,
  type: 'cbor'
}
