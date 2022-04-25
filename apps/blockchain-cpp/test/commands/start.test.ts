import { Start } from '../../src/commands/start'
import { exec } from 'child_process'
// NOTE: you have to use the CLI to run tests - using IntelliJ (i.e. clicking it) to run it seems to pass in unwanted args
const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
describe('start', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
  })
  afterEach(() => {
    exec('docker rm $(docker stop defi-cli-container)')
  })
  it('should start container in detached mode', async () => {
    await Start.run([])
    // TODO: test directly if docker container starts?
    expect(console.log).toHaveBeenLastCalledWith('Happy hacking!')
  })
})
