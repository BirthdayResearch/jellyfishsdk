import { ApiClient } from '@defichain/jellyfish-api-core'

/* eslint-disable @typescript-eslint/no-var-requires */
const Jellyfish = require('../src')

describe('with new keyword', () => {
  it('should be able to create new Client without params', () => {
    const client = new Jellyfish.Client()
    expect(client).toBeInstanceOf(ApiClient)
  })

  it('should be able to create new Client with HttpProvider', () => {
    const client = new Jellyfish.Client(new Jellyfish.HttpProvider('http://localhost'))
    expect(client).toBeInstanceOf(ApiClient)
  })
})

describe('without new keyword', () => {
  it('should be able to create Client without params', () => {
    const client = Jellyfish.Client()
    expect(client).toBeInstanceOf(ApiClient)
  })
})
