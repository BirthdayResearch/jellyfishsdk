/**
 * Duplicates the top stack item.
 */
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
 * Duplicates the top stack item.
 */
export class OP_DUP extends StaticCode {
  constructor () {
    super(0x76, 'OP_DUP')
  }
}
