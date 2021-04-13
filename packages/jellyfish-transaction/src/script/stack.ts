/**
 * Duplicates the top stack item.
 */
import { StaticCode } from './opcode'

/**
 * Duplicates the top stack item.
 */
export class OP_DUP extends StaticCode {
  constructor () {
    super(0x76, 'OP_DUP')
  }
}
