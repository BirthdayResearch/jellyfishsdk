import { expect, test } from '@oclif/test'

describe('take-snapshot', () => {
  test
    .stdout()
    .command(['take-snapshot'])
    .it('runs hello', ctx => {
      expect(ctx.stdout).to.contain('hello world')
    })

  test
    .stdout()
    .command(['take-snapshot', '--name', 'jeff'])
    .it('runs hello --name jeff', ctx => {
      expect(ctx.stdout).to.contain('hello jeff')
    })
})
