import { StaticCode } from './opcode'

/**
 * Concatenates two strings. disabled.
 */
export class OP_CAT extends StaticCode {
  constructor () {
    super(0x7e, 'OP_CAT')
  }
}

/**
 * Returns a section of a string. disabled.
 */
export class OP_SUBSTR extends StaticCode {
  constructor () {
    super(0x7f, 'OP_SUBSTR')
  }
}

/**
 * Keeps only characters left of the specified point in a string. disabled.
 */
export class OP_LEFT extends StaticCode {
  constructor () {
    super(0x80, 'OP_LEFT')
  }
}

/**
 * Keeps only characters right of the specified point in a string. disabled.
 */
export class OP_RIGHT extends StaticCode {
  constructor () {
    super(0x81, 'OP_RIGHT')
  }
}

/**
 * Pushes the string length of the top element of the stack (without popping it).
 */
export class OP_SIZE extends StaticCode {
  constructor () {
    super(0x82, 'OP_SIZE')
  }
}
