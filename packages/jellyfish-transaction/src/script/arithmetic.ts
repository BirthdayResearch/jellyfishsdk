import { StaticCode } from './opcode'

/**
 * 1 is added to the input.
 */
export class OP_1ADD extends StaticCode {
  constructor () {
    super(0x8b, 'OP_1ADD')
  }
}

/**
 * 1 is subtracted from the input.
 */
export class OP_1SUB extends StaticCode {
  constructor () {
    super(0x8c, 'OP_1SUB')
  }
}

/**
 * The input is multiplied by 2. disabled.
 */
export class OP_2MUL extends StaticCode {
  constructor () {
    super(0x8d, 'OP_2MUL')
  }
}

/**
 * The input is divided by 2. disabled.
 */
export class OP_2DIV extends StaticCode {
  constructor () {
    super(0x8e, 'OP_2DIV')
  }
}

/**
 * The sign of the input is flipped.
 */
export class OP_NEGATE extends StaticCode {
  constructor () {
    super(0x8f, 'OP_NEGATE')
  }
}

/**
 *  The input is made positive.
 */
export class OP_ABS extends StaticCode {
  constructor () {
    super(0x90, 'OP_ABS')
  }
}

/**
 * If the input is 0 or 1, it is flipped. Otherwise the output will be 0.
 */
export class OP_NOT extends StaticCode {
  constructor () {
    super(0x91, 'OP_NOT')
  }
}

/**
 * Returns 0 if the input is 0. 1 otherwise.
 */
export class OP_0NOTEQUAL extends StaticCode {
  constructor () {
    super(0x92, 'OP_0NOTEQUAL')
  }
}

/**
 * a is added to b.
 */
export class OP_ADD extends StaticCode {
  constructor () {
    super(0x93, 'OP_ADD')
  }
}

/**
 * b is subtracted from a.
 */
export class OP_SUB extends StaticCode {
  constructor () {
    super(0x94, 'OP_SUB')
  }
}

/**
 * a is multiplied by b. disabled.
 */
export class OP_MUL extends StaticCode {
  constructor () {
    super(0x95, 'OP_MUL')
  }
}

/**
 * a is divided by b. disabled.
 */
export class OP_DIV extends StaticCode {
  constructor () {
    super(0x96, 'OP_DIV')
  }
}

/**
 * Returns the remainder after dividing a by b. disabled.
 */
export class OP_MOD extends StaticCode {
  constructor () {
    super(0x97, 'OP_MOD')
  }
}

/**
 * Shifts a left b bits, preserving sign. disabled.
 */
export class OP_LSHIFT extends StaticCode {
  constructor () {
    super(0x98, 'OP_LSHIFT')
  }
}

/**
 * Shifts a right b bits, preserving sign. disabled.
 */
export class OP_RSHIFT extends StaticCode {
  constructor () {
    super(0x99, 'OP_RSHIFT')
  }
}

/**
 * If both a and b are not 0, the output is 1. Otherwise 0.
 */
export class OP_BOOLAND extends StaticCode {
  constructor () {
    super(0x9a, 'OP_BOOLAND')
  }
}

/**
 * If a or b is not 0, the output is 1. Otherwise 0.
 */
export class OP_BOOLOR extends StaticCode {
  constructor () {
    super(0x9b, 'OP_BOOLOR')
  }
}

/**
 * Returns 1 if the numbers are equal, 0 otherwise.
 */
export class OP_NUMEQUAL extends StaticCode {
  constructor () {
    super(0x9c, 'OP_NUMEQUAL')
  }
}

/**
 * Same as OP_NUMEQUAL, but runs OP_VERIFY afterward.
 */
export class OP_NUMEQUALVERIFY extends StaticCode {
  constructor () {
    super(0x9d, 'OP_NUMEQUALVERIFY')
  }
}

/**
 * Returns 1 if the numbers are not equal, 0 otherwise.
 */
export class OP_NUMNOTEQUAL extends StaticCode {
  constructor () {
    super(0x9e, 'OP_NUMNOTEQUAL')
  }
}

/**
 * Returns 1 if a is less than b, 0 otherwise.
 */
export class OP_LESSTHAN extends StaticCode {
  constructor () {
    super(0x9f, 'OP_LESSTHAN')
  }
}

/**
 * Returns 1 if a is greater than b, 0 otherwise.
 */
export class OP_GREATERTHAN extends StaticCode {
  constructor () {
    super(0xa0, 'OP_GREATERTHAN')
  }
}

/**
 * Returns 1 if a is less than or equal to b, 0 otherwise.
 */
export class OP_LESSTHANOREQUAL extends StaticCode {
  constructor () {
    super(0xa1, 'OP_LESSTHANOREQUAL')
  }
}

/**
 *  Returns 1 if a is greater than or equal to b, 0 otherwise.
 */
export class OP_GREATERTHANOREQUAL extends StaticCode {
  constructor () {
    super(0xa2, 'OP_GREATERTHANOREQUAL')
  }
}

/**
 *  Returns the smaller of a and b.
 */
export class OP_MIN extends StaticCode {
  constructor () {
    super(0xa3, 'OP_MIN')
  }
}

/**
 *  Returns the larger of a and b.
 */
export class OP_MAX extends StaticCode {
  constructor () {
    super(0xa4, 'OP_MAX')
  }
}

/**
 *   Returns 1 if txn_builder_update_loan_token1.test.ts is within the specified range (left-inclusive), 0 otherwise.
 */
export class OP_WITHIN extends StaticCode {
  constructor () {
    super(0xa5, 'OP_WITHIN')
  }
}
