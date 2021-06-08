import { StaticCode } from './opcode'

/**
 * Does nothing.
 */
export class OP_NOP extends StaticCode {
  constructor () {
    super(0x61, 'OP_NOP')
  }
}

/**
 * Puts the version of the protocol under which this transaction will be evaluated onto the stack.
 */
export class OP_VER extends StaticCode {
  constructor () {
    super(0x62, 'OP_VER')
  }
}

/**
 * If the top stack value is true, the statements are executed
 */
export class OP_IF extends StaticCode {
  constructor () {
    super(0x63, 'OP_IF')
  }
}

/**
 * If the top stack value is false, the statements are executed.
 */
export class OP_NOTIF extends StaticCode {
  constructor () {
    super(0x64, 'OP_NOTIF')
  }
}

/**
 * If the top stack value is equal to the version of the protocol under which
 * this transaction will be evaluated, the statements between IF and ELSE are executed.
 */
export class OP_VERIF extends StaticCode {
  constructor () {
    super(0x65, 'OP_VERIF')
  }
}

/**
 *  If the top stack value is not equal to the version of the protocol under which this
 *  transaction will be evaluated, the statements between IF and ELSE are executed.
 */
export class OP_VERNOTIF extends StaticCode {
  constructor () {
    super(0x66, 'OP_VERNOTIF')
  }
}

/**
 * If the preceding OP_IF or OP_NOTIF or OP_ELSE was not executed then these
 * statements are and otherwise if executed.
 */
export class OP_ELSE extends StaticCode {
  constructor () {
    super(0x67, 'OP_ELSE')
  }
}

/**
 * Ends an if/else block. All blocks must end, or the transaction is invalid.
 */
export class OP_ENDIF extends StaticCode {
  constructor () {
    super(0x68, 'OP_ENDIF')
  }
}

/**
 * Marks transaction as invalid if top stack value is not true.
 */
export class OP_VERIFY extends StaticCode {
  constructor () {
    super(0x69, 'OP_VERIFY')
  }
}

/**
 * Marks transaction as invalid.
 */
export class OP_RETURN extends StaticCode {
  constructor () {
    super(0x6a, 'OP_RETURN')
  }
}
