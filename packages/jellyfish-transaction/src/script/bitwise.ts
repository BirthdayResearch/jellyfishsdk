import { StaticCode } from './opcode'

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
