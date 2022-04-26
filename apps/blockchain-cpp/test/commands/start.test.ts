import { Start } from '../../src/commands/start'
import Dockerode from 'dockerode'
// NOTE: you have to use the CLI to run tests - using IntelliJ (i.e. clicking it) to run it seems to pass in unwanted args
const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
// TODO: Use .env for test purposes
// const snapshotLocation: string = (process.env.SNAPSHOT as string)

describe('start', () => {
  const docker = new Dockerode()
  beforeEach(() => {
    consoleSpy.mockClear()
  })
  // TODO: Figure out why this doesn't work
  afterEach(async () => {
    const container = docker.getContainer('defi-cli-container')
    await container.stop()
    await container.remove()
  })
  it('should start container in detached mode', async () => {
    await Start.run([])
    // TODO: test directly if docker container starts?
    expect(console.log).toHaveBeenLastCalledWith('Happy hacking!')
  })
  it('should start container with valid snapshot', async () => {
    await Start.run(['/Users/justinwong/Documents/snapshot'])
    // Follow jellyfish testing package design
    expect(console.log).toHaveBeenLastCalledWith('Happy hacking!')
  })
  // TODO: Test with invalid snapshot
})
