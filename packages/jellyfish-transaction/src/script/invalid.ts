import { StaticCode } from './opcode'

/**
 * Represents any OP code not currently assigned
 */
export class OP_INVALIDOPCODE extends StaticCode {
  constructor () {
    super(0xff, 'OP_INVALIDOPCODE')
  }
}
