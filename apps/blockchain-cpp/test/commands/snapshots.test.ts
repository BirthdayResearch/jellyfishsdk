import { expect, test } from '@oclif/test'

describe('snapshots', () => {
  test
    .stdout()
    .command(['snapshots'])
    .it('retrieves list of snapshots', ctx => {
      expect(ctx.stdout).to.contain('index-2.3.0.txt')
    })
})
