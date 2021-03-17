import { ApiClient } from '@defichain/api-core'
import Jellyfish from '../src/jellyfish'

describe('with new keyword', () => {
  it('should be able to create Client without params', () => {
    const client = new Jellyfish.Client()
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with string', () => {
    const client = new Jellyfish.Client('http://localhost')
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with HttpProvider', () => {
    const client = new Jellyfish.Client(new Jellyfish.HttpProvider('http://localhost'))
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with OceanProvider', () => {
    const client = new Jellyfish.Client(new Jellyfish.OceanProvider())
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with OceanProvider and options', () => {
    const client = new Jellyfish.Client(new Jellyfish.OceanProvider(), {
      timeout: 15000
    })
    expect(client).toBeInstanceOf(ApiClient)
  })
})

describe('without new keyword', () => {
  it('should be able to create Client without params', () => {
    const client = Jellyfish.Client()
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with string', () => {
    const client = Jellyfish.Client('http://localhost')
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with HttpProvider', () => {
    const client = Jellyfish.Client(Jellyfish.HttpProvider('http://localhost'))
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with OceanProvider', () => {
    const client = Jellyfish.Client(Jellyfish.OceanProvider())
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with OceanProvider and options', () => {
    const client = Jellyfish.Client(Jellyfish.OceanProvider(), {
      timeout: 15000
    })
    expect(client).toBeInstanceOf(ApiClient)
  })
})
