import { Injectable } from '@nestjs/common'
import BigNumber from 'bignumber.js'
import { Database, Model, ModelMapping, SortOrder } from '../../indexer/database/_abstract'
import { makeDynamooseSchema } from '../../indexer/database/DynamoDb'

const DCT_ID_START: number = 128

export interface Token extends Model {
  symbol: string
  name: string
  decimal: number
  limit: string
  isDAT: boolean
  isLPS: boolean
  tradeable: boolean
  mintable: boolean
  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

interface _Token extends Token {
  _fixedPartitionKey: 0
}

const TokenMapping: ModelMapping<_Token> = {
  type: 'Token',
  attributes: [
    'id',
    'symbol',
    'name',
    'decimal',
    'limit',
    'isDAT',
    'isLPS',
    'tradeable',
    'mintable',
    'block'
  ],
  index: {
    symbol: {
      name: 'symbol-index',
      partition: {
        type: 'string',
        attributeName: 'symbol'
      }
    },
    idSortedListIndex: {
      name: 'id-sorted-list-index',
      partition: {
        type: 'number',
        attributeName: '_fixedPartitionKey'
      },
      sort: {
        type: 'string',
        attributeName: 'id'
      }
    }
  }
}

export const TokenSchema = makeDynamooseSchema(TokenMapping)

@Injectable()
export class TokenMapper {
  constructor (
    private readonly database: Database
  ) {
  }

  async put (token: Token): Promise<void> {
    await this.database.put<_Token>(TokenMapping, {
      ...token,
      _fixedPartitionKey: 0
    })
  }

  async get (id: string): Promise<Token | undefined> {
    const token = await this.database.getById<_Token>(TokenMapping, id)
    return token ?? undefined
  }

  async getBySymbol (symbol: string): Promise<Partial<Token | undefined>> {
    const token = await this.database.getByIndex<_Token>(TokenMapping, TokenMapping.index.symbol, symbol)
    return token ?? undefined
  }

  async delete (id: string): Promise<void> {
    await this.database.delete<_Token>(TokenMapping, id)
  }

  async getNextTokenID (isDAT: boolean): Promise<number> {
    if (isDAT) {
      const latest = await this.getLatestDAT()
      if (latest === undefined) {
        throw new Error('Latest DAT by ID not found')
      }

      const latestId = new BigNumber(latest.id)
      if (!latestId.lt(DCT_ID_START - 1)) {
        const latestDST = await this.getLatestDST()
        return latestDST !== undefined ? latestId.plus(1).toNumber() : DCT_ID_START
      }

      return latestId.plus(1).toNumber()
    }

    const latest = await this.getLatestDST()
    if (latest === undefined) {
      // Default to DCT_ID_START if no existing DST
      return DCT_ID_START
    }

    const latestId = new BigNumber(latest.id)
    return latestId.plus(1).toNumber()
  }

  private async getLatestDAT (): Promise<Token | undefined> {
    const { data: tokens } = await this.database.query<_Token>(TokenMapping, TokenMapping.index.idSortedListIndex, {
      partitionKey: 0,
      limit: 1,
      order: SortOrder.DESC
    })
    return tokens[0] ?? undefined
  }

  private async getLatestDST (): Promise<Token | undefined> {
    const { data: tokens } = await this.database.query<_Token>(TokenMapping, TokenMapping.index.idSortedListIndex, {
      partitionKey: 0,
      limit: 1,
      order: SortOrder.DESC
    })
    if (tokens.length === 0 || new BigNumber(tokens[0].id).lt(DCT_ID_START)) {
      return undefined
    }
    return tokens[0] ?? undefined
  }
}
