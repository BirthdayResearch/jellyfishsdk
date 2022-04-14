import { expect, test } from '@oclif/test'

describe('snapshots', () => {
  test
    .stdout()
    .command(['snapshots'])
    .it('runs hello', ctx => {
      expect(ctx.stdout).to.contain('hello world')
    })

  test
    .stdout()
    .command(['snapshots', '--name', 'jeff'])
    .it('runs hello --name jeff', ctx => {
      expect(ctx.stdout).to.contain('hello jeff')
    })
})
