import { StaticCode } from './opcode'

/**
 * The input is hashed using RIPEMD-160.
 */
export class OP_RIPEMD160 extends StaticCode {
  constructor () {
    super(0xa6, 'OP_RIPEMD160')
  }
}

/**
 * The input is hashed twice: first with SHA-256 and then with RIPEMD-160.
 */
export class OP_HASH160 extends StaticCode {
  constructor () {
    super(0xa9, 'OP_HASH160')
  }
}

/**
 * The entire transaction's outputs, inputs, and script (from the most recently-executed OP_CODESEPARATOR to the end)
 * are hashed.
 * The signature used by OP_CHECKSIG must be a valid signature for this hash and public key.
 * If it is, 1 is returned, 0 otherwise.
 */
export class OP_CHECKSIG extends StaticCode {
  constructor () {
    super(0xac, 'OP_CHECKSIG')
  }
}
