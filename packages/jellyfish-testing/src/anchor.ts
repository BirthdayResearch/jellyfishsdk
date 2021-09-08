import { TestingGroup } from './testing'

export class TestingGroupAnchor {
  constructor (
    private readonly testingGroup: TestingGroup
  ) {
  }

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
