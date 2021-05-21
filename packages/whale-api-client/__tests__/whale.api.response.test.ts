import { WhaleApiResponse, ApiPagedResponse } from '../src'

it('should behavior as an array', () => {
  const response: WhaleApiResponse<number[]> = {
    data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  }

  const pagination = new ApiPagedResponse(response, 'GET', '/')

  expect(pagination.length).toStrictEqual(10)
  expect(pagination[0]).toStrictEqual(0)
  expect(pagination[4]).toStrictEqual(4)
  expect(pagination[9]).toStrictEqual(9)
  expect(pagination[10]).toBeUndefined()
})

it('should have next token', () => {
  const response: WhaleApiResponse<number[]> = {
    data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    page: {
      next: '9'
    }
  }

  const pagination = new ApiPagedResponse(response, 'GET', '/items')

  expect(pagination.hasNext).toStrictEqual(true)
  expect(pagination.nextToken).toStrictEqual('9')
})

it('should not have next', () => {
  const response: WhaleApiResponse<number[]> = {
    data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  }

  const pagination = new ApiPagedResponse(response, 'GET', '/items')

  expect(pagination.hasNext).toStrictEqual(false)
  expect(pagination.nextToken).toBeUndefined()
})
