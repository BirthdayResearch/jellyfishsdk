import { ApiSliceResponse } from '@src/module.api/interceptors/api.slice.response'

it('should create with ApiSliceResponse.next', () => {
  const items = [{ id: '1', sort: 'a' }, { id: '2', sort: 'b' }]

  expect(ApiSliceResponse.next(items).page).toBeUndefined()
  expect(ApiSliceResponse.next(items, 'b').page?.next).toEqual('b')
})

it('should not create next with ApiSliceResponse.of using provider with limit = 3', () => {
  const items = [
    { id: '1', sort: 'a' },
    { id: '1', sort: 'b' }
  ]

  expect(ApiSliceResponse.of(items, 3, item => {
    return item.sort
  }).page).toBeUndefined()
})

it('should create next with ApiSliceResponse.of using provider with limit = 3', () => {
  const items = [
    { id: '1', sort: 'a' },
    { id: '1', sort: 'b' },
    { id: '1', sort: 'c' }
  ]

  expect(ApiSliceResponse.of(items, 3, item => {
    return item.sort
  }).page?.next).toBe('c')
})
