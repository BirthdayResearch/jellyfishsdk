import { expect, test } from '@oclif/test'

// TODO: Write tests after writing tests for start command
describe('rpc', () => {
  test
    .stdout()
    .command(['rpc'])
    .it('runs hello', ctx => {
      expect(ctx.stdout).to.contain('hello world')
    })

  test
    .stdout()
    .command(['rpc', '--name', 'jeff'])
    .it('runs hello --name jeff', ctx => {
      expect(ctx.stdout).to.contain('hello jeff')
    })
})
