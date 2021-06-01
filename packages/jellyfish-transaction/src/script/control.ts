import { StaticCode } from './opcode'

/**
 * Marks transaction as invalid.
 */
export class OP_RETURN extends StaticCode {
  constructor () {
    super(0x6a, 'OP_RETURN')
  }
}

export class OP_NOP extends StaticCode {
  constructor () {
    super(0x61, 'OP_NOP')
  }
}

export class OP_VER extends StaticCode {
  constructor () {
    super(0x62, 'OP_VER')
  }
}

export class OP_IF extends StaticCode {
  constructor () {
    super(0x63, 'OP_IF')
  }
}

export class OP_NOTIF extends StaticCode {
  constructor () {
    super(0x64, 'OP_NOTIF')
  }
}

export class OP_VERIF extends StaticCode {
  constructor () {
    super(0x65, 'OP_VERIF')
  }
}

export class OP_VERNOTIF extends StaticCode {
  constructor () {
    super(0x66, 'OP_VERNOTIF')
  }
}

export class OP_ELSE extends StaticCode {
  constructor () {
    super(0x67, 'OP_ELSE')
  }
}

export class OP_ENDIF extends StaticCode {
  constructor () {
    super(0x68, 'OP_ENDIF')
  }
}

export class OP_VERIFY extends StaticCode {
  constructor () {
    super(0x69, 'OP_VERIFY')
  }
}
