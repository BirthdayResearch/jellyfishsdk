import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingGroup } from './testing'

export class TestingGroupAnchor {
  constructor (
    private readonly testingGroup: TestingGroup<MasterNodeRegTestContainer>
  ) {
  }

  /**
   * After every new block the anchor data creation team members will create
   * and sign new anchor data.
   * Anchor data is created every fifthteen blocks,
   * the block height and hash chosen is then three hours further back into the chain
   * and then more blocks until the every the fifthteen block frequency is matched again.
   * https://github.com/DeFiCh/ain/wiki/What-is-an-anchor%3F#anchor-data-creation
   * @param {number} numOfAuths
   * @param {number} initOffsetHour
   * @return {Promise<void>}
   */
  async generateAnchorAuths (numOfAuths: number, initOffsetHour: number): Promise<void> {
    for (let i = 1; i < 3 + numOfAuths + 1; i += 1) {
      await this.testingGroup.exec(async testing => {
        await testing.misc.offsetTimeHourly(initOffsetHour + i)
      })
      await this.testingGroup.get(0).generate(15)
      await this.testingGroup.waitForSync()
    }
  }
}
