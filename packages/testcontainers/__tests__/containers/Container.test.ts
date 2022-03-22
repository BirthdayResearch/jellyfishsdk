import { DeFiDContainer, DeFiDRpcError, RegTestContainer, StartOptions } from '../../src'

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
    expect(() => {
      container.getRpcPort()
    }).toThrow(/container not yet started/)
  })

  it('should error rpc as DeFiDRpcError', async () => {
    container = new RegTestContainer()
    await container.start()
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
    return await expect(container.start({ timeout: 5000 }))
      .rejects.toThrow(/container stopped\/paused/)
  })

  it('should get error: container not yet started if container is stopped', async () => {
    container = new RegTestContainer()
    await container.start()
    await container.stop()
    return expect(() => {
      container.getRpcPort()
    }).toThrow(/container not yet started/)
  })
})
