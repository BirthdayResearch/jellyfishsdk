import { SmartBuffer } from 'smart-buffer'
import { CBlockHeader, BlockHeader } from '../src/blockHeader'
import BigNumber from 'bignumber.js'

describe('blockHeader', () => {
  const data = '000000207b8a4f55907404fb75651bba54ded7b45f3629a128e07a7642ed70fb74db44d754a004227cc77dd273b77735edfd171724d00101810111507d59d96fbd58bc6b1c4d2e61ffff7f20bfcf142527f23b7d84dd2cb32efe154b0b65a6989b2d3b3d650023a3af2ed8fd0100000000000000010000000000000041204978f9e004df1f077f39350bc775e8184ac40d9470279e600aadcf13ed16625911f1f7c3756f728fd1887f57be85e7362a39a9b2557a8c1953b9601d9538bd43'

  const blockHeader: BlockHeader = {
    version: 536870912,
    hashPrevBlock: 'd744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b',
    hashMerkleRoot: '6bbc58bd6fd9597d501101810101d0241717fded3577b773d27dc77c2204a054',
    time: 1630424348,
    bits: 0x207fffff,
    stakeModifier: 'fdd82eafa32300653d3b2d9b98a6650b4b15fe2eb32cdd847d3bf2272514cfbf',
    height: new BigNumber(1),
    mintedBlocks: new BigNumber(1),
    signature: '204978f9e004df1f077f39350bc775e8184ac40d9470279e600aadcf13ed16625911f1f7c3756f728fd1887f57be85e7362a39a9b2557a8c1953b9601d9538bd43'
  }

  describe('Composable', () => {
    it('should compose from buffer to composable', () => {
      const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
      const composable = new CBlockHeader(buffer)

      expect(composable.toObject()).toStrictEqual(blockHeader)
    })

    it('should compose from composable to buffer', () => {
      const composable = new CBlockHeader(blockHeader)
      const buffer = new SmartBuffer()
      composable.toBuffer(buffer)

      expect(buffer.toBuffer().toString('hex')).toStrictEqual(data)
    })
  })
})
