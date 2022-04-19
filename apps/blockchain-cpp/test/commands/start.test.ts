import { expect, test } from '@oclif/test'

// TODO: Figure out how to write tests for commands that have promises to resolve
describe('start', () => {
  test
    .stdout()
    .command(['start'])
    .it('starts container in detached mode', (ctx) => {
      console.log(ctx.stdout)
    // expect(ctx.stdout).to.contain('The local node has successfully booted up! :)')
    })
})
