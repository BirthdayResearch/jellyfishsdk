import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CResignMasterNode, ResignMasterNode } from '../../../../src/script/dftx/dftx_masternode'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    // https://testnet.defichain.io/#/DFI/testnet/tx/5fe549cb230b0ec515de27d0bb7ae5642d47bfeb08b4210d9d2a5ddf2ef71f81
    '6a254466547852bea590236c7d994fbc2283a0e84934022afc1adb8472e409c35ef9a7aa9920a3',
    '6a2544665478525fe549cb230b0ec515de27d0bb7ae5642d47bfeb08b4210d9d2a5ddf2ef71f81'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x52)
  })
})

const header = '6a254466547852' // OP_RETURN, PUSH_DATA(44665478, 52)
const data = 'bea590236c7d994fbc2283a0e84934022afc1adb8472e409c35ef9a7aa9920a3' // reversed, after buffer
const resignMasterNode: ResignMasterNode = {
  nodeId: 'a32099aaa7f95ec309e47284db1afc2a023449e8a08322bc4f997d6c2390a5be' // txid when mn created
}

it('should craft dftx with OP_CODES._()', () => {
  const stack = [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX_RESIGN_MASTER_NODE(resignMasterNode)
  ]

  const buffer = toBuffer(stack)
  expect(buffer.toString('hex')).toStrictEqual(header + data)
})

describe('Composable', () => {
  it('should compose from buffer to composable', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    const composable = new CResignMasterNode(buffer)
    expect(composable.toObject()).toStrictEqual(resignMasterNode)
  })

  it('should compose from composable to buffer', () => {
    const composable = new CResignMasterNode(resignMasterNode)
    const buffer = new SmartBuffer()
    composable.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
  })
})
