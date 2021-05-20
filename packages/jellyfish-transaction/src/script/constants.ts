import { StaticCode } from './opcode'

/**
 * An empty array of bytes is pushed onto the stack.
 * (This is not a no-op: an item is added to the stack.)
 * @see OP_FALSE
 */
export class OP_0 extends StaticCode {
  constructor () {
    super(0x00, 'OP_0')
  }
}

/**
 * An empty array of bytes is pushed onto the stack.
 * (This is not a no-op: an item is added to the stack.)
 * @see OP_0
 */
export class OP_FALSE extends OP_0 {
}

/**
 * The number -1 is pushed onto the stack.
 */
export class OP_1NEGATE extends StaticCode {
  constructor () {
    super(0x4f, 'OP_1NEGATE')
  }
}

/**
 * Transaction is invalid unless occuring in an unexecuted OP_IF branch.
 */
export class OP_RESERVED extends StaticCode {
  constructor () {
    super(0x50, 'OP_RESERVED')
  }
}

/**
 * The number 1 is pushed onto the stack.
 * @see OP_TRUE
 */
export class OP_1 extends StaticCode {
  constructor () {
    super(0x51, 'OP_1')
  }
}

/**
 * The number 1 is pushed onto the stack.
 * @see OP_1
 */
export class OP_TRUE extends OP_1 {
}

/**
 * The number 2 is pushed onto the stack.
 */
export class OP_2 extends StaticCode {
  constructor () {
    super(0x52, 'OP_2')
  }
}

/**
 * The number 3 is pushed onto the stack.
 */
export class OP_3 extends StaticCode {
  constructor () {
    super(0x53, 'OP_3')
  }
}

/**
 * The number 4 is pushed onto the stack.
 */
export class OP_4 extends StaticCode {
  constructor () {
    super(0x54, 'OP_4')
  }
}

/**
 * The number 5 is pushed onto the stack.
 */
export class OP_5 extends StaticCode {
  constructor () {
    super(0x55, 'OP_5')
  }
}

/**
 * The number 6 is pushed onto the stack.
 */
export class OP_6 extends StaticCode {
  constructor () {
    super(0x56, 'OP_6')
  }
}

/**
 * The number 7 is pushed onto the stack.
 */
export class OP_7 extends StaticCode {
  constructor () {
    super(0x57, 'OP_7')
  }
}

/**
 * The number 8 is pushed onto the stack.
 */
export class OP_8 extends StaticCode {
  constructor () {
    super(0x58, 'OP_8')
  }
}

/**
 * The number 9 is pushed onto the stack.
 */
export class OP_9 extends StaticCode {
  constructor () {
    super(0x59, 'OP_9')
  }
}

/**
 * The number 10 is pushed onto the stack.
 */
export class OP_10 extends StaticCode {
  constructor () {
    super(0x5a, 'OP_10')
  }
}

/**
 * The number 11 is pushed onto the stack.
 */
export class OP_11 extends StaticCode {
  constructor () {
    super(0x5b, 'OP_11')
  }
}

/**
 * The number 12 is pushed onto the stack.
 */
export class OP_12 extends StaticCode {
  constructor () {
    super(0x5c, 'OP_12')
  }
}

/**
 * The number 13 is pushed onto the stack.
 */
export class OP_13 extends StaticCode {
  constructor () {
    super(0x5d, 'OP_13')
  }
}

/**
 * The number 14 is pushed onto the stack.
 */
export class OP_14 extends StaticCode {
  constructor () {
    super(0x5e, 'OP_14')
  }
}

/**
 * The number 15 is pushed onto the stack.
 */
export class OP_15 extends StaticCode {
  constructor () {
    super(0x5f, 'OP_15')
  }
}

/**
 * The number 16 is pushed onto the stack.
 */
export class OP_16 extends StaticCode {
  constructor () {
    super(0x60, 'OP_16')
  }
}
