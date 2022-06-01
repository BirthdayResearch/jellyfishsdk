import { Model, ModelMapping } from '@defichain/jellyfish-database/src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@defichain/jellyfish-database/src/module.database/database'
import { HexEncoder } from './_hex.encoder'
import BigNumber from 'bignumber.js'

export const MAX_TOKEN_SYMBOL_LENGTH: number = 8
export const MAX_TOKEN_NAME_LENGTH: number = 128
const DCT_ID_START: number = 128

const TokenMapping: ModelMapping<Token> = {
  type: 'token',
  index: {
    sort: {
      name: 'token_key_sort',
      partition: {
        type: 'string',
        key: (b: Token) => b.sort
      }
    }
  }
}

@Injectable()
export class TokenMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<Token[]> {
    return await this.database.query(TokenMapping.index.sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async queryAsc (limit: number, lt?: string): Promise<Token[]> {
    return await this.database.query(TokenMapping.index.sort, {
      limit: limit,
      order: SortOrder.ASC,
      lt: lt
    })
  }

  async getByTxId (txId: string): Promise<Token | undefined> {
    return await this.database.get(TokenMapping, txId)
  }

  async getByTokenId (tokenId: number): Promise<Token | undefined> {
    return await this.database.get(TokenMapping.index.sort, HexEncoder.encodeHeight(tokenId))
  }

  async put (token: Token): Promise<void> {
    return await this.database.put(TokenMapping, token)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(TokenMapping, id)
  }

  async getNextTokenID (isDAT: boolean): Promise<number> {
    if (isDAT) {
      const latest = await this.getLatestDAT()
      if (latest === undefined) {
        throw new Error('Latest DAT by ID not found')
      }

      const latestId = new BigNumber(latest.tokenId)
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

    const latestId = new BigNumber(latest.tokenId)
    return latestId.plus(1).toNumber()
  }

  private async getLatestDAT (): Promise<Token | undefined> {
    const latest = await this.database.query(TokenMapping.index.sort, {
      limit: 1,
      order: SortOrder.DESC,
      lt: HexEncoder.encodeHeight(DCT_ID_START)
    })

    return latest[0]
  }

  private async getLatestDST (): Promise<Token | undefined> {
    const latest = await this.database.query(TokenMapping.index.sort, {
      limit: 1,
      order: SortOrder.DESC
    })

    if (latest.length === 0 || new BigNumber(latest[0].tokenId).lt(DCT_ID_START)) {
      return undefined
    }

    return latest[0]
  }
}

export interface Token extends Model {
  id: string // ---------| txid
  sort: string // -------| tokenId (hex encoded)
  tokenId: number

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
