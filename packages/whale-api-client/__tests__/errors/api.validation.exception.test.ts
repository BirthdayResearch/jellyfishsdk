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

  expect(exception.message).toStrictEqual('422 - ValidationError (/link/to/validation/error)')
  expect(exception.code).toStrictEqual(422)
  expect(exception.type).toStrictEqual('ValidationError')
  expect(exception.properties).toStrictEqual([
    {
      property: 'key',
      value: 'value',
      constraints: [
        'value is missing'
      ]
    }
  ])
})
