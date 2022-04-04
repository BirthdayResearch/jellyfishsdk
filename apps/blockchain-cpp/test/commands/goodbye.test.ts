import {expect, test} from '@oclif/test'

describe('goodbye', () => {
  test
  .stdout()
  .command(['goodbye'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['goodbye', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
