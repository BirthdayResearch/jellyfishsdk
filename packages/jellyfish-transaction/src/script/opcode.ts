/**
 * Operation code, script words, opcodes, commands and functions there are many names to this.
 * This is essentially things to be pushed into the DeFi scripting stack.
 *
 * Like bitcoin, it uses a scripting system for transactions.
 * Script is simple, stack-based, and processed from left to right.
 * It is intentionally none Turing-complete, with no loops.
 *
 * In jellyfish-transaction, this stack scripting is implemented as class for first class type support.
 * This allows instanceof assertions and wraps all data to be pushed into a stack as a an instantiatable object.
 */
export abstract class OPCode {
  abstract asm (): string

  abstract asBuffer (): Buffer
}

/**
 * Statically mapped code of OPCode
 */
export abstract class StaticCode extends OPCode {
  protected readonly code: number

  constructor (code: number) {
    super()
    this.code = code
  }

  asBuffer (): Buffer {
    const buffer = Buffer.allocUnsafe(1)
    buffer.writeUInt8(this.code)
    return buffer
  }
}
