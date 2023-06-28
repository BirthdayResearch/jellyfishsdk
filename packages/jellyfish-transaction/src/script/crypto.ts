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
 * The input is hashed using SHA-1.
 */
export class OP_SHA1 extends StaticCode {
  constructor () {
    super(0xa7, 'OP_SHA1')
  }
}

/**
 * The input is hashed using SHA-3.
 */
export class OP_SHA3 extends StaticCode {
  constructor () {
    super(0xc0, 'OP_SHA3')
  }
}

/**
 * The input is hashed using SHA-256.
 */
export class OP_SHA256 extends StaticCode {
  constructor () {
    super(0xa8, 'OP_SHA256')
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
 * The input is hashed two times with SHA-256.
 */
export class OP_HASH256 extends StaticCode {
  constructor () {
    super(0xaa, 'OP_HASH256')
  }
}

/**
 * All of the signature checking words will only match
 * signatures to the data after the most recently-executed
 * OP_CODESEPARATOR.
 */
export class OP_CODESEPARATOR extends StaticCode {
  constructor () {
    super(0xab, 'OP_CODESEPARATOR')
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

/**
 * Same as OP_CHECKSIG, but OP_VERIFY is executed afterward.
 */
export class OP_CHECKSIGVERIFY extends StaticCode {
  constructor () {
    super(0xad, 'OP_CHECKSIGVERIFY')
  }
}

/**
 * Compares the first signature against each public key
 * until it finds an ECDSA match. Starting with the
 * subsequent public key, it compares the second
 * signature against each remaining public key until it
 * finds an ECDSA match. The process is repeated until
 * all signatures have been checked or not enough public
 * keys remain to produce a successful result.
 * All signatures need to match a public key.
 * Because public keys are not checked again if they
 * fail any signature comparison, signatures must be
 * placed in the scriptSig using the same order as their
 * corresponding public keys were placed in the
 * scriptPubKey or redeemScript.If all signatures are
 * valid, 1 is returned, 0 otherwise. Due to a bug, one
 * extra unused value is removed from the stack.
 */
export class OP_CHECKMULTISIG extends StaticCode {
  constructor () {
    super(0xae, 'OP_CHECKMULTISIG')
  }
}

/**
 * Same as OP_CHECKMULTISIG, but OP_VERIFY is executed afterward.
 */
export class OP_CHECKMULTISIGVERIFY extends StaticCode {
  constructor () {
    super(0xaf, 'OP_CHECKMULTISIGVERIFY')
  }
}
