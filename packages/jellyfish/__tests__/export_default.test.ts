import { ApiClient } from '@defichain/jellyfish-api-core'
import Jellyfish from '../src'

describe('with new keyword', () => {
  it('should be able to create Client with string', () => {
    const client = new Jellyfish.Client('http://localhost')
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with HttpProvider', () => {
    const client = new Jellyfish.Client(new Jellyfish.HttpProvider('http://localhost'))
    expect(client).toBeInstanceOf(ApiClient)
  })
})

describe('without new keyword', () => {
  it('should be able to create Client with string', () => {
    const client = Jellyfish.Client('http://localhost')
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create Client with HttpProvider', () => {
    const client = Jellyfish.Client(Jellyfish.HttpProvider('http://localhost'))
    expect(client).toBeInstanceOf(ApiClient)
  })
})
