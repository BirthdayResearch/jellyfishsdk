import { ApiResponse, ApiResponsePagination } from '../src'

it('should behavior as an array', () => {
  const response: ApiResponse<number[]> = {
    data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  }

  const pagination = new ApiResponsePagination(response, 'GET', '/')

  expect(pagination.length).toBe(10)
  expect(pagination[0]).toBe(0)
  expect(pagination[4]).toBe(4)
  expect(pagination[9]).toBe(9)
  expect(pagination[10]).toBeUndefined()
})

it('should have next token', () => {
  const response: ApiResponse<number[]> = {
    data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    page: {
      next: 9
    }
  }

  const pagination = new ApiResponsePagination(response, 'GET', '/items')

  expect(pagination.hasNext).toBe(true)
  expect(pagination.nextToken).toBe(9)
})

it('should not have next', () => {
  const response: ApiResponse<number[]> = {
    data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  }

  const pagination = new ApiResponsePagination(response, 'GET', '/items')

  expect(pagination.hasNext).toBe(false)
  expect(pagination.nextToken).toBeUndefined()
})
