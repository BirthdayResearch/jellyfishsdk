import { ApiClient } from '@defichain/jellyfish-api-core'
import { Client, OceanProvider, HttpProvider } from '../src/jellyfish'

describe('with new keyword', () => {
  it('should be able to create Client without params', () => {
    const client = new Client()
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with string', () => {
    const client = new Client('http://localhost')
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with HttpProvider', () => {
    const client = new Client(new HttpProvider('http://localhost'))
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with OceanProvider', () => {
    const client = new Client(new OceanProvider())
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with OceanProvider and options', () => {
    const client = new Client(new OceanProvider(), {
      timeout: 15000
    })
    expect(client).toBeInstanceOf(ApiClient)
  })
})

describe('without new keyword', () => {
  it('should be able to create Client without params', () => {
    const client = Client()
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with string', () => {
    const client = Client('http://localhost')
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with HttpProvider', () => {
    const client = Client(HttpProvider('http://localhost'))
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with OceanProvider', () => {
    const client = Client(OceanProvider())
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with OceanProvider and options', () => {
    const client = Client(OceanProvider(), {
      timeout: 15000
    })
    expect(client).toBeInstanceOf(ApiClient)
  })
})
