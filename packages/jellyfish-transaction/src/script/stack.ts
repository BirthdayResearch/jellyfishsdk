import { StaticCode } from './opcode'

/**
 * Puts the input onto the top of the alt stack. Removes it from the main stack.
 */
export class OP_TOALTSTACK extends StaticCode {
  constructor () {
    super(0x6b, 'OP_TOALTSTACK')
  }
}

/**
 * Puts the input onto the top of the main stack. Removes it from the alt stack.
 */
export class OP_FROMALTSTACK extends StaticCode {
  constructor () {
    super(0x6c, 'OP_FROMALTSTACK')
  }
}

/**
 * Removes the top two stack items.
 */
export class OP_2DROP extends StaticCode {
  constructor () {
    super(0x6d, 'OP_2DROP')
  }
}

/**
 * Duplicates the top two stack items.
 */
export class OP_2DUP extends StaticCode {
  constructor () {
    super(0x6e, 'OP_2DUP')
  }
}

/**
 * Duplicates the top three stack items.
 */
export class OP_3DUP extends StaticCode {
  constructor () {
    super(0x6f, 'OP_3DUP')
  }
}

/**
 * Copies the pair of items two spaces back in the stack to the front.
 */
export class OP_2OVER extends StaticCode {
  constructor () {
    super(0x70, 'OP_2OVER')
  }
}

/**
 * The fifth and sixth items back are moved to the top of the stack.
 */
export class OP_2ROT extends StaticCode {
  constructor () {
    super(0x71, 'OP_2ROT')
  }
}

/**
 * Swaps the top two pairs of items.
 */
export class OP_2SWAP extends StaticCode {
  constructor () {
    super(0x72, 'OP_2SWAP')
  }
}

/**
 * If the top stack value is not 0, duplicate it.
 */
export class OP_IFDUP extends StaticCode {
  constructor () {
    super(0x73, 'OP_IFDUP')
  }
}

/**
 * Puts the number of stack items onto the stack.
 */
export class OP_DEPTH extends StaticCode {
  constructor () {
    super(0x74, 'OP_DEPTH')
  }
}

/**
 * Removes the top stack item.
 */
export class OP_DROP extends StaticCode {
  constructor () {
    super(0x75, 'OP_DROP')
  }
}

/**
 * Duplicates the top stack item.
 */
export class OP_DUP extends StaticCode {
  constructor () {
    super(0x76, 'OP_DUP')
  }
}

/**
 * Removes the second-to-top stack item.
 */
export class OP_NIP extends StaticCode {
  constructor () {
    super(0x77, 'OP_NIP')
  }
}

/**
 * Copies the second-to-top stack item to the top.
 */
export class OP_OVER extends StaticCode {
  constructor () {
    super(0x78, 'OP_OVER')
  }
}

/**
 * The item n back in the stack is copied to the top.
 */
export class OP_PICK extends StaticCode {
  constructor () {
    super(0x79, 'OP_PICK')
  }
}

/**
 * The item n back in the stack is moved to the top.
 */
export class OP_ROLL extends StaticCode {
  constructor () {
    super(0x7a, 'OP_ROLL')
  }
}

/**
 * The 3rd item down the stack is moved to the top.
 */
export class OP_ROT extends StaticCode {
  constructor () {
    super(0x7b, 'OP_ROT')
  }
}

/**
 * The top two items on the stack are swapped.
 */
export class OP_SWAP extends StaticCode {
  constructor () {
    super(0x7c, 'OP_SWAP')
  }
}

/**
 * The item at the top of the stack is copied and inserted before the second-to-top item.
 */
export class OP_TUCK extends StaticCode {
  constructor () {
    super(0x7d, 'OP_TUCK')
  }
}
