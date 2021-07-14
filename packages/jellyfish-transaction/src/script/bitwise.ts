import { StaticCode } from './opcode'

/**
 * Flips all of the bits in the input.
 */
export class OP_INVERT extends StaticCode {
  constructor () {
    super(0x83, 'OP_INVERT')
  }
}

/**
 * Boolean AND between each bit in the inputs.
 */
export class OP_AND extends StaticCode {
  constructor () {
    super(0x84, 'OP_AND')
  }
}

/**
 * Boolean OR between each bit in the inputs.
 */
export class OP_OR extends StaticCode {
  constructor () {
    super(0x85, 'OP_OR')
  }
}

/**
 * Boolean exclusive OR between each bit in the inputs.
 */
export class OP_XOR extends StaticCode {
  constructor () {
    super(0x86, 'OP_XOR')
  }
}

/**
 * Returns 1 if the inputs are exactly equal, 0 otherwise.
 */
export class OP_EQUAL extends StaticCode {
  constructor () {
    super(0x87, 'OP_EQUAL')
  }
}

/**
 * Same as OP_EQUAL, but runs OP_VERIFY afterward.
 */
export class OP_EQUALVERIFY extends StaticCode {
  constructor () {
    super(0x88, 'OP_EQUALVERIFY')
  }
}

/**
 * Transaction is invalid unless occuring in an unexecuted OP_IF branch.
 */
export class OP_RESERVED1 extends StaticCode {
  constructor () {
    super(0x89, 'OP_RESERVED1')
  }
}

/**
 * Transaction is invalid unless occuring in an unexecuted OP_IF branch.
 */
export class OP_RESERVED2 extends StaticCode {
  constructor () {
    super(0x8a, 'OP_RESERVED2')
  }
}
