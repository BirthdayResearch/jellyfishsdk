import { TestingGroup } from './testing'

export class TestingGroupAnchor {
  constructor (
    private readonly testingGroup: TestingGroup
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
      const c = await this.testingGroup.get(0).container.getBlockCount()
      const a0 = await this.testingGroup.get(0).container.call('spv_listanchorauths')
      const a1 = await this.testingGroup.get(1).container.call('spv_listanchorauths')
      const a2 = await this.testingGroup.get(2).container.call('spv_listanchorauths')
      console.log('a0: ', i, c, a0)
      console.log('a1: ', i, c, a1)
      console.log('a2: ', i, c, a2)
    }
  }
}
