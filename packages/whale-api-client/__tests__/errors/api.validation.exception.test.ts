import { WhaleApiErrorType, WhaleApiValidationException } from '../../src'

it('WhaleApiValidationException should includes properties', () => {
  const error = {
    code: 422,
    type: WhaleApiErrorType.ValidationError,
    at: 1234,
    url: '/link/to/validation/error',
    validation: {
      properties: [
        {
          property: 'key',
          value: 'value',
          constraints: [
            'value is missing'
          ]
        }
      ]
    }
  }

  const exception = new WhaleApiValidationException(error)

  expect(exception.message).toBe('422 - ValidationError (/link/to/validation/error)')
  expect(exception.code).toBe(422)
  expect(exception.type).toBe('ValidationError')
  expect(exception.properties).toEqual([
    {
      property: 'key',
      value: 'value',
      constraints: [
        'value is missing'
      ]
    }
  ])
})
