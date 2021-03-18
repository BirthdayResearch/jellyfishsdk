import { JsonRpcClient } from '../src'
import { RegTestContainer } from '@defichain/testcontainers'
import { ClientApiError, ApiError, RpcApiError } from '@defichain/api-core'
import nock from 'nock'

describe('JSON-RPC 1.0 specification', () => {
  const intercept = jest.fn()

  beforeEach(() => {
    nock('http://intercepted.defichain.node')
      .post('/')
      .reply(200, function (_, body: string) {
        const req = JSON.parse(body)
        intercept(req)
        return {
          result: 'intercepted',
          id: req.id
        }
      })
      .persist()
  })

  afterEach(() => {
    jest.clearAllMocks()
    nock.cleanAll()
  })

  it('should conform to JSON-RPC 1.0 specification', async () => {
    const client = new JsonRpcClient('http://intercepted.defichain.node')
    const result = await client.call('intercept', ['p1', 'p2'], 'number')

    await expect(result).toBe('intercepted')

    await expect(intercept.mock.calls[0][0].jsonrpc).toBe('1.0')
    await expect(intercept.mock.calls[0][0].id).toBeGreaterThan(-1)
    await expect(intercept.mock.calls[0][0].method).toBe('intercept')
    await expect(intercept.mock.calls[0][0].params).toEqual(['p1', 'p2'])
  })

  it('generated id must be positive as per the spec', async () => {
    const client = new JsonRpcClient('http://intercepted.defichain.node')

    for (const i of [...Array(100).keys()]) {
      await client.call(`generate${i}`, [], 'number')
      await expect(intercept.mock.calls[i][0].id).toBeGreaterThan(-1)
      await expect(intercept.mock.calls[i][0].id.toString()).not.toEqual(
        expect.not.stringMatching('.')
      )
    }
  })

  it('should generate a different id for each RPC', async () => {
    const client = new JsonRpcClient('http://intercepted.defichain.node')
    await client.call('generate0', [], 'number')
    await client.call('generate1', [], 'number')
    await client.call('generate2', [], 'number')

    await expect(intercept.mock.calls[0][0].id).not.toBe(intercept.mock.calls[1][0].id)
    await expect(intercept.mock.calls[1][0].id).not.toBe(intercept.mock.calls[2][0].id)
  })
})

describe('ApiError', () => {
  const container = new RegTestContainer()

  beforeAll(async () => {
    await container.start({
      user: 'foo',
      password: 'bar'
    })
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw RpcApiError', async () => {
    const url = await container.getCachedRpcUrl()
    const client = new JsonRpcClient(url)

    const promise = client.call('importprivkey', ['invalid-key'], 'lossless')

    await expect(promise).rejects.toThrow(ApiError)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid private key encoding\', code: -5')
  })

  it('should throw ClientApiError: 404 - Not Found', async () => {
    const url = await container.getCachedRpcUrl()
    const client = new JsonRpcClient(url)

    const promise = client.call('invalid', [], 'number')

    await expect(promise).rejects.toThrow(ApiError)
    await expect(promise).rejects.toThrow(ClientApiError)
    await expect(promise).rejects.toThrow('ClientApiError: 404 - Not Found')
  })

  it('should throw ClientApiError: 401 - Unauthorized', async () => {
    const port = await container.getRpcPort()
    const client = new JsonRpcClient(`http://foo:not-bar@localhost:${port}`)

    const promise = client.mining.getMintingInfo()

    await expect(promise).rejects.toThrow(ApiError)
    await expect(promise).rejects.toThrow(ClientApiError)
    await expect(promise).rejects.toThrow('ClientApiError: 401 - Unauthorized')
  })
})

describe('ClientOptions', () => {
  afterEach(() => {
    jest.clearAllMocks()
    nock.cleanAll()
  })

  it('should send with custom headers', async () => {
    nock('http://options.defid.node')
      .matchHeader('Authorization', 'Bearer OCEAN')
      .post('/')
      .reply(200, { result: 'authorized' })

    const client = new JsonRpcClient('http://options.defid.node', {
      headers: {
        Authorization: 'Bearer OCEAN'
      }
    })

    const result = await client.call('authorize', [], 'number')
    await expect(result).toBe('authorized')
  })

  it('should timeout in 2 second', async () => {
    nock('http://options.defid.node')
      .post('/')
      .delayConnection(5000)
      .reply(200, { result: 'timeout' })

    const client = new JsonRpcClient('http://options.defid.node', {
      timeout: 2000
    })

    const promise = client.mining.getMintingInfo()
    await expect(promise).rejects.toThrow(ApiError)
    await expect(promise).rejects.toThrow(ClientApiError)
    await expect(promise).rejects.toThrow('ClientApiError: request aborted due to set timeout of 2000ms')
  })
})
