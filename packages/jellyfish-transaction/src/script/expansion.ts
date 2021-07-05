import { StaticCode } from './opcode'

/**
 * This instruction performs no operation.
 * No items are added to the stack.
 */
export class OP_NOP1 extends StaticCode {
  constructor () {
    super(0xb0, 'OP_NOP1')
  }
}

/**
 * This instruction allows a transaction output to be made unspendable until some point in the future.
 */
export class OP_CHECKLOCKTIMEVERIFY extends StaticCode {
  constructor () {
    super(0xb1, 'OP_CHECKLOCKTIMEVERIFY')
  }
}

/**
 * This instruction allows a transaction output to be made unspendable until some point in the future.
 * @See OP_CHECKLOCKTIMEVERIFY
 */
export class OP_NOP2 extends OP_CHECKLOCKTIMEVERIFY {
}

/**
 * This instruction allows execution pathways of a script to be restricted based on the age of the output being spent.
 */
export class OP_CHECKSEQUENCEVERIFY extends StaticCode {
  constructor () {
    super(0xb2, 'OP_CHECKSEQUENCEVERIFY')
  }
}

/**
 * This instruction allows execution pathways of a script to be restricted based on the age of the output being spent.
 * @See OP_CHECKSEQUENCEVERIFY
 */
export class OP_NOP3 extends OP_CHECKSEQUENCEVERIFY {
}

/**
 * This instruction performs no operation.
 * No items are added to the stack.
 */
export class OP_NOP4 extends StaticCode {
  constructor () {
    super(0xb3, 'OP_NOP4')
  }
}

/**
 * This instruction performs no operation.
 * No items are added to the stack.
 */
export class OP_NOP5 extends StaticCode {
  constructor () {
    super(0xb4, 'OP_NOP5')
  }
}

/**
 * This instruction performs no operation.
 * No items are added to the stack.
 */
export class OP_NOP6 extends StaticCode {
  constructor () {
    super(0xb5, 'OP_NOP6')
  }
}

/**
 * This instruction performs no operation.
 * No items are added to the stack.
 */
export class OP_NOP7 extends StaticCode {
  constructor () {
    super(0xb6, 'OP_NOP7')
  }
}

/**
 * This instruction performs no operation.
 * No items are added to the stack.
 */
export class OP_NOP8 extends StaticCode {
  constructor () {
    super(0xb7, 'OP_NOP8')
  }
}

/**
 * This instruction performs no operation.
 * No items are added to the stack.
 */
export class OP_NOP9 extends StaticCode {
  constructor () {
    super(0xb8, 'OP_NOP9')
  }
}

/**
 * This instruction performs no operation.
 * No items are added to the stack.
 */
export class OP_NOP10 extends StaticCode {
  constructor () {
    super(0xb9, 'OP_NOP10')
  }
}
