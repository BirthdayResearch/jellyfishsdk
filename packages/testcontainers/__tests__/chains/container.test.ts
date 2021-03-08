import { RegTestContainer } from '../../src/chains/reg_test_container'
import { DeFiDContainer, DeFiDRpcError, StartOptions } from '../../src/chains/container'

describe('container error handling', () => {
  let container: DeFiDContainer

  afterEach(async () => {
    try {
      await container?.stop()
    } catch (ignored) {
    }
  })

  it('should error immediately if required container is not yet started', async () => {
    container = new RegTestContainer()
    return await expect(container.getRpcPort())
      .rejects.toThrow(/container not yet started/)
  })

  it('should error rpc as DeFiDRpcError', async () => {
    container = new RegTestContainer()
    await container.start()
    await container.waitForReady()
    return await expect(container.call('invalid'))
      .rejects.toThrowError(DeFiDRpcError)
  })

  it('should get error: container might have crashed if invalid Cmd is present', async () => {
    class InvalidCmd extends RegTestContainer {
      public getCmd (opts: StartOptions): string[] {
        return [
          ...super.getCmd(opts),
          '-invalid=123'
        ]
      }
    }

    container = new InvalidCmd()
    await container.start()
    return expect(container.waitForReady(3000))
      .rejects.toThrow(/Unable to find rpc port, the container might have crashed/)
  })

  it('should get error: container not found if container is stopped', async () => {
    container = new RegTestContainer()
    await container.start()
    await container.stop()
    return await expect(container.getRpcPort())
      .rejects.toThrow(/\(HTTP code 404\) no such container - No such container:/)
  })

  it('should fail fast if wait for is set to 100ms', async () => {
    container = new RegTestContainer()
    await container.start()
    await expect(container.waitForReady(100))
      .rejects.toThrow(/DeFiDContainer docker not ready within given timeout of/)
  })
})
