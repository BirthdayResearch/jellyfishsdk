import { getName } from '../src/testcontainers'

it('should getName testcontainers', () => {
  expect(getName()).toBe('testcontainers')
})
