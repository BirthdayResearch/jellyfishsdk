import { getName } from '../src/jsonrpc'

it('should getName jsonrpc', () => {
  expect(getName()).toBe('jellyfish-jsonrpc')
})
