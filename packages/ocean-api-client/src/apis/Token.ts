import { OceanApiClient } from '../'
import { gql } from 'graphql-request'

export class Token {
  constructor (private readonly api: OceanApiClient) {
  }

  async get (id: string): Promise<any> {
    const query = gql`
      {
        Token(id: $id) {
          id
          symbol
          displaySymbol
          symbolKey
          name
          decimal
          limit
          mintable
          tradeable
          isDAT
          isLPS
          finalized
          minted
          collateralAddress
        }
      }
    `

    return await this.api.requestGraphQL(query, { id: id })
  }
}
