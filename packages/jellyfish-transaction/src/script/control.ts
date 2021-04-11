import { StaticCode } from './opcode'

/**
 * Marks transaction as invalid.
 */
export class OP_RETURN extends StaticCode {
  constructor () {
    super(0x6a)
  }

  asm (): string {
    return 'OP_RETURN'
  }
}
