import { ApiPagedResponse, ApiResponse } from '@defichain/ocean-api-core'

describe('ApiPagedResponse', () => {
  it('should have getter methods', () => {
    const response: ApiResponse<number[]> = {
      data: [0, 1, 2]
    }
    const pagination = new ApiPagedResponse(response, 'GET', '/')

    expect(pagination[0]).toStrictEqual(0)
    expect(pagination.endpoint).toStrictEqual('/')
    expect(pagination.method).toStrictEqual('GET')
    expect(pagination.page).toStrictEqual(undefined)
    expect(pagination.hasNext).toStrictEqual(false)
    expect(pagination.nextToken).toStrictEqual(undefined)
  })

  it('should behavior as an array', () => {
    const response: ApiResponse<number[]> = {
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
    const response: ApiResponse<number[]> = {
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
    const response: ApiResponse<number[]> = {
      data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }

    const pagination = new ApiPagedResponse(response, 'GET', '/items')

    expect(pagination.hasNext).toStrictEqual(false)
    expect(pagination.nextToken).toBeUndefined()
  })

  it('should be able to filter', () => {
    const response: ApiResponse<number[]> = {
      data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }

    const pagination = new ApiPagedResponse(response, 'GET', '/items')

    expect(pagination.filter(value => value % 2 === 0)).toStrictEqual([
      0, 2, 4, 6, 8
    ])
  })

  it('should be able to map', () => {
    const response: ApiResponse<number[]> = {
      data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }

    const pagination = new ApiPagedResponse(response, 'GET', '/items')

    expect(pagination.map(value => value * 11)).toStrictEqual([
      0, 11, 22, 33, 44, 55, 66, 77, 88, 99
    ])
  })
})
