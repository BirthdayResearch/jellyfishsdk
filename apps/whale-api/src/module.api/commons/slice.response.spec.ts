import { SliceResponse } from '@src/module.api/commons/slice.response'

it('should create with SliceResponse.next', () => {
  const items = [{ id: '1', sort: 'a' }, { id: '2', sort: 'b' }]

  expect(SliceResponse.next(items).page).toBeUndefined()
  expect(SliceResponse.next(items, 'b').page?.next).toEqual('b')
})

it('should not create next with SliceResponse.of using provider with limit = 3', () => {
  const items = [
    { id: '1', sort: 'a' },
    { id: '1', sort: 'b' }
  ]

  expect(SliceResponse.of(items, 3, item => {
    return item.sort
  }).page).toBeUndefined()
})

it('should create next with SliceResponse.of using provider with limit = 3', () => {
  const items = [
    { id: '1', sort: 'a' },
    { id: '1', sort: 'b' },
    { id: '1', sort: 'c' }
  ]

  expect(SliceResponse.of(items, 3, item => {
    return item.sort
  }).page?.next).toBe('c')
})
