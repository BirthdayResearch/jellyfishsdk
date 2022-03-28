import { ApiPagedResponse } from '../../module.api/_core/api.paged.response'

it('should create with ApiPagedResponse.next', () => {
  const items = [{ id: '1', sort: 'a' }, { id: '2', sort: 'b' }]

  expect(ApiPagedResponse.next(items).page).toBeUndefined()
  expect(ApiPagedResponse.next(items, 'b').page?.next).toStrictEqual('b')
})

it('should not create next with ApiPagedResponse.of using provider with limit = 3', () => {
  const items = [
    { id: '1', sort: 'a' },
    { id: '1', sort: 'b' }
  ]

  expect(ApiPagedResponse.of(items, 3, item => {
    return item.sort
  }).page).toBeUndefined()
})

it('should create next with ApiPagedResponse.of using provider with limit = 3', () => {
  const items = [
    { id: '1', sort: 'a' },
    { id: '1', sort: 'b' },
    { id: '1', sort: 'c' }
  ]

  expect(ApiPagedResponse.of(items, 3, item => {
    return item.sort
  }).page?.next).toStrictEqual('c')
})
