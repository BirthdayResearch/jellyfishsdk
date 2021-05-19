import BigNumber from 'bignumber.js'
import { calculateFee, calculateFeeP2WPKH, calculateVirtual, calculateWeight, isDustAmount } from '../src'
import {
  DeFiTransactionConstants,
  OP_CODES,
  Transaction,
  Vin,
  Vout,
  Witness
} from '@defichain/jellyfish-transaction'

describe('dust amount', () => {
  it('0.00001 should be dust amount', () => {
    const amount = new BigNumber('0.00001')
    expect(isDustAmount(amount)).toBe(true)
  })

  it('0.00003 should be dust amount', () => {
    const amount = new BigNumber('0.00003')
    expect(isDustAmount(amount)).toBe(true)
  })

  it('0.000031 should not be dust amount', () => {
    const amount = new BigNumber('0.000031')
    expect(isDustAmount(amount)).toBe(false)
  })
})

const P2WPKH_VIN: Vin = {
  index: 0,
  script: { stack: [] },
  sequence: 4294967294,
  txid: 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f'
}

const P2SH_P2WPKH_VIN: Vin = {
  index: 0,
  script: {
    stack: [
      OP_CODES.OP_PUSHDATA_HEX_LE('0014fdaf1a51958c21e89826a3c405209dd222de3496')
    ]
  },
  sequence: 4294967294,
  txid: 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f'
}

const P2PKH_VIN: Vin = {
  index: 0,
  script: {
    stack: [
      OP_CODES.OP_PUSHDATA_HEX_LE('30450221008b9d1dc26ba6a9cb62127b02742fa9d754cd3bebf337f7a55d114c8e5cdd30be022040529b194ba3f9281a99f2b1c0a19c0489bc22ede944ccf4ecbab4cc618ef3ed01')
    ]
  },
  sequence: 0xffffffff,
  txid: 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f'
}

const P2WPKH_VOUT: Vout = {
  value: new BigNumber('10'),
  script: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('8280b37df378db99f66f85c95a783a76ac7a6d59')
    ]
  },
  tokenId: 0x00
}

const P2WSH_VOUT: Vout = {
  value: new BigNumber('100'),
  script: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('5d1b56b63d714eebe542309525f484b7e9d6f686b3781b6f61ef925d66d6f6a0')
    ]
  },
  tokenId: 0x00
}

const P2SH_VOUT: Vout = {
  value: new BigNumber('100'),
  script: {
    stack: [
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('0f9acb591b5089224c08e28705cd16908490bb08'),
      OP_CODES.OP_EQUAL
    ]
  },
  tokenId: 0x00
}

const P2PKH_VOUT: Vout = {
  value: new BigNumber('100'),
  script: {
    stack: [
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      OP_CODES.OP_PUSHDATA_HEX_LE('3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ]
  },
  tokenId: 0x00
}

const P2WPKH_WITNESS: Witness = {
  scripts: [
    { hex: '3044022000000000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000000001' },
    { hex: '000000000000000000000000000000000000000000000000000000000000000000' }
  ]
}

describe('calculate fee for p2wpkh', () => {
  it('[P2WPKH_VIN] to [P2WPKH_VOUT] with fee 0.0006689 DFI/kb', () => {
    const fee = new BigNumber(0.0006689)
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2WPKH_VIN],
      vout: [P2WPKH_VOUT],
      lockTime: 0x00000000
    }
    expect(calculateFeeP2WPKH(fee, transaction).toFixed(8)).toBe('0.00007425')
  })

  it('[P2WPKH_VIN] to [P2WPKH_VOUT, P2WPKH_VOUT] with fee 0.0006689 DFI/kb', () => {
    const fee = new BigNumber(0.0006689)
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2WPKH_VIN],
      vout: [P2WPKH_VOUT, P2WPKH_VOUT],
      lockTime: 0x00000000
    }
    expect(calculateFeeP2WPKH(fee, transaction).toFixed(8)).toBe('0.00009565')
  })
})

describe('calculate fee', () => {
  it('[P2WPKH_VIN] to [P2WPKH_VOUT] with fee 0.00003000 DFI/kb', () => {
    const fee = new BigNumber(0.00003000)
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2WPKH_VIN],
      vout: [P2WPKH_VOUT],
      lockTime: 0x00000000
    }
    const witness: Witness[] = [
      P2WPKH_WITNESS
    ]
    expect(calculateFee(fee, transaction, witness).toFixed(8)).toBe('0.00000333')
  })

  it('[P2WPKH_VIN] to [P2WPKH_VOUT] with fee 0.00010000 DFI/kb', () => {
    const fee = new BigNumber(0.00010000)
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2WPKH_VIN],
      vout: [P2WPKH_VOUT],
      lockTime: 0x00000000
    }
    const witness: Witness[] = [
      P2WPKH_WITNESS
    ]
    expect(calculateFee(fee, transaction, witness).toFixed(8)).toBe('0.00001110')
  })

  it('[P2WPKH_VIN] to [P2WPKH_VOUT] with fee 0.0006689 DFI/kb', () => {
    const fee = new BigNumber(0.0006689)
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2WPKH_VIN],
      vout: [P2WPKH_VOUT],
      lockTime: 0x00000000
    }
    const witness: Witness[] = [
      P2WPKH_WITNESS
    ]
    expect(calculateFee(fee, transaction, witness).toFixed(8)).toBe('0.00007425')
  })

  it('[P2WPKH_VIN] to [P2WPKH_VOUT, P2WPKH_VOUT] with fee 0.0006689 DFI/kb', () => {
    const fee = new BigNumber(0.0006689)
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2WPKH_VIN],
      vout: [P2WPKH_VOUT, P2WPKH_VOUT],
      lockTime: 0x00000000
    }
    const witness: Witness[] = [
      P2WPKH_WITNESS
    ]
    expect(calculateFee(fee, transaction, witness).toFixed(8)).toBe('0.00009565')
  })
})

describe('virtual size', () => {
  it('[P2WPKH_VIN] to [P2WPKH_VOUT]', () => {
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2WPKH_VIN],
      vout: [P2WPKH_VOUT],
      lockTime: 0x00000000
    }
    const witness: Witness[] = [
      P2WPKH_WITNESS
    ]
    expect(calculateVirtual(transaction, witness)).toBe(111)
  })

  it('[P2SH_P2WPKH_VIN] to [P2SH_VOUT,P2SH_VOUT]', () => {
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2SH_P2WPKH_VIN],
      vout: [P2SH_VOUT, P2SH_VOUT],
      lockTime: 0x00000000
    }
    const witness: Witness[] = [
      P2WPKH_WITNESS
    ]
    expect(calculateVirtual(transaction, witness)).toBe(168)
  })
})

describe('weight', () => {
  it('[P2WPKH_VIN] to [P2WPKH_VOUT]', () => {
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2WPKH_VIN],
      vout: [P2WPKH_VOUT],
      lockTime: 0x00000000
    }
    const witness: Witness[] = [
      P2WPKH_WITNESS
    ]
    expect(calculateWeight(transaction, witness)).toBe(441)
  })

  it('[P2WPKH_VIN] to [P2WSH_VOUT, P2PKH_VOUT]', () => {
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2PKH_VIN],
      vout: [P2WSH_VOUT, P2PKH_VOUT],
      lockTime: 0x00000000
    }
    const witness: Witness[] = []
    expect(calculateWeight(transaction, witness)).toBe(814)
  })

  it('[P2SH_P2WPKH_VIN] to [P2SH_VOUT,P2SH_VOUT]', () => {
    const transaction: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: [P2SH_P2WPKH_VIN],
      vout: [P2SH_VOUT, P2SH_VOUT],
      lockTime: 0
    }
    const witness: Witness[] = [
      P2WPKH_WITNESS
    ]
    expect(calculateWeight(transaction, witness)).toBe(669)
  })
})
