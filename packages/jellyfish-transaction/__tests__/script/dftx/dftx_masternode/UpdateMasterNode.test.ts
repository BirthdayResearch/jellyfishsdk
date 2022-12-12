import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX } from '../../../../src/script/dftx'
import { OP_CODES } from '../../../../src'
import { toBuffer, toOPCodes } from '../../../../src/script/_buffer'
import { CUpdateMasternode, UpdateMasternode } from '../../../../src/script/dftx/dftx_masternode'

it('should bi-directional buffer-object-buffer', () => {
  const fixtures = [
    // update owner address with p2wpkh address
    '6a3d446654786d2319bc7b76b6916d0b61ee7a408d47d33380be746d11a5702bd87bbee5f8d3bd010104141db4d4d5e7d01091545e5573494b2fd1e91215d9',
    // update operator address with p2wpkh address
    '6a3d446654786d2319bc7b76b6916d0b61ee7a408d47d33380be746d11a5702bd87bbee5f8d3bd010204141db4d4d5e7d01091545e5573494b2fd1e91215d9',
    // update reward address with p2wpkh address
    '6a3d446654786d2319bc7b76b6916d0b61ee7a408d47d33380be746d11a5702bd87bbee5f8d3bd010304141db4d4d5e7d01091545e5573494b2fd1e91215d9',
    // update owner, operator and reward addresses with p2wpkh address
    '6a4c6b446654786d2319bc7b76b6916d0b61ee7a408d47d33380be746d11a5702bd87bbee5f8d3bd030104141db4d4d5e7d01091545e5573494b2fd1e91215d902041476e76cdb4de312861ce893f307e7e2bd40a8ac2d030414b188e161a83571c5acd9dd40b316796a47c606d1',
    // update owner address with p2pkh address
    '6a3d446654786d2319bc7b76b6916d0b61ee7a408d47d33380be746d11a5702bd87bbee5f8d3bd010101141db4d4d5e7d01091545e5573494b2fd1e91215d9',
    // update operator address with p2pkh address
    '6a3d446654786d2319bc7b76b6916d0b61ee7a408d47d33380be746d11a5702bd87bbee5f8d3bd010201141db4d4d5e7d01091545e5573494b2fd1e91215d9',
    // update reward address with p2pkh address
    '6a3d446654786d2319bc7b76b6916d0b61ee7a408d47d33380be746d11a5702bd87bbee5f8d3bd010301141db4d4d5e7d01091545e5573494b2fd1e91215d9',
    // update owner, operator and reward addresses with p2pkh address
    '6a4c6b446654786d2319bc7b76b6916d0b61ee7a408d47d33380be746d11a5702bd87bbee5f8d3bd030101141db4d4d5e7d01091545e5573494b2fd1e91215d902011476e76cdb4de312861ce893f307e7e2bd40a8ac2d030114b188e161a83571c5acd9dd40b316796a47c606d1',
    // remove reward address
    '6a29446654786d2319bc7b76b6916d0b61ee7a408d47d33380be746d11a5702bd87bbee5f8d3bd01040000'
  ]

  fixtures.forEach(hex => {
    const stack = toOPCodes(
      SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    )
    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(hex)
    expect((stack[1] as OP_DEFI_TX).tx.type).toStrictEqual(0x6d)
  })
})

describe('UpdateMasternode', () => {
  const header = '6a4c54446654786d' // OP_RETURN(0x6a) OP_PUSHDATA1 (length 84 = 0x54) CDfTx.SIGNATURE(0x44665478) CUpdateMasternode.OP_CODE(0x6d)

  const data = '2319bc7b76b6916d0b61ee7a408d47d33380be746d11a5702bd87bbee5f8d3bd020104141db4d4d5e7d01091545e5573494b2fd1e91215d902041476e76cdb4de312861ce893f307e7e2bd40a8ac2d'
  // UpdateMasternode.nodeId [LE] (bdd3f8e5be7bd82b70a5116d74be8033d3478d407aee610b6d91b6767bbc1923)
  // UpdateMasternode.updates [array length] (0x02)
  // UpdateMasternodeData.updateType [OwnerAddress] (0x01)
  // UpdateMasternodeAddress.addressType [p2wpkh] (0x04)
  // UpdateMasternodeAddress.addressPubKeyHash (length 20 = 0x14) (1db4d4d5e7d01091545e5573494b2fd1e91215d9)
  // UpdateMasternodeData.updateType [OperatorAddress] (0x02)
  // UpdateMasternodeAddress.addressType [p2wpkh] (0x04)
  // UpdateMasternodeAddress.addressPubKeyHash (length 20 = 0x14) (76e76cdb4de312861ce893f307e7e2bd40a8ac2d)

  const updateMasternode: UpdateMasternode = {
    nodeId: 'bdd3f8e5be7bd82b70a5116d74be8033d3478d407aee610b6d91b6767bbc1923',
    updates: [
      {
        updateType: 0x01,
        address: { addressType: 0x04, addressPubKeyHash: '1db4d4d5e7d01091545e5573494b2fd1e91215d9' }
      },
      {
        updateType: 0x02,
        address: { addressType: 0x04, addressPubKeyHash: '76e76cdb4de312861ce893f307e7e2bd40a8ac2d' }
      }
    ]
  }

  it('should craft dftx with OP_CODES._()', () => {
    const stack = [
      OP_CODES.OP_RETURN,
      OP_CODES.OP_DEFI_TX_UPDATE_MASTER_NODE(updateMasternode)
    ]

    const buffer = toBuffer(stack)
    expect(buffer.toString('hex')).toStrictEqual(header + data)
  })

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CUpdateMasternode(buffer)
      expect(composable.toObject()).toStrictEqual(updateMasternode)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CUpdateMasternode(updateMasternode)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})
