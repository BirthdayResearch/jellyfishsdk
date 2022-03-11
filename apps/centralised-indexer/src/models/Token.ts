import { Schema } from 'dynamoose'
import { Injectable } from '@nestjs/common'
import { InjectModel, Model } from 'nestjs-dynamoose'
import BigNumber from 'bignumber.js'
import { SortOrder } from 'dynamoose/dist/General'

const FIXED_PARTITION_KEY = 0
const DCT_ID_START: number = 128

export interface TokenKey {
  id: number
}

export interface Token extends TokenKey {
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

  _fixedPartitionKey?: 0
}

export const TokenSchema = new Schema({
  id: {
    type: Number,
    hashKey: true
  },
  symbol: String,
  name: String,
  decimal: Number,
  limit: String,
  isDAT: Boolean,
  isLPS: Boolean,
  tradeable: Boolean,
  mintable: Boolean,
  block: {
    type: Object,
    schema: {
      hash: String,
      height: Number,
      time: Number,
      medianTime: Number
    }
  },

  _fixedPartitionKey: {
    default: FIXED_PARTITION_KEY,
    forceDefault: true,
    type: Number,
    index: [
      { // Supports querying for the last token id
        global: true,
        name: 'id-sorted-list-index',
        rangeKey: 'id'
      }
    ]
  }
})

@Injectable()
export class TokenService {
  constructor (
    @InjectModel('Token')
    private readonly model: Model<Token, TokenKey>
  ) {
  }

  async upsert (token: Token): Promise<void> {
    await this.model.create(token, { overwrite: true, return: 'document' })
  }

  async get (id: number): Promise<Token | undefined> {
    const token = await this.model.get({ id })
    console.log('>>> Errr ', token)
    if (token === undefined) {
      return undefined
    }
    console.log('>>> What is this: ', token)
    delete token._fixedPartitionKey
    return token
  }

  async delete (id: number): Promise<void> {
    const token = this.model.get({ id })
    if (token === undefined) {
      return
    }
    await this.model.delete({ id })
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
    const latest = await this.model
      .query({
        id: { lt: DCT_ID_START },
        _fixedPartitionKey: { eq: FIXED_PARTITION_KEY }
      })
      .using('id-sorted-list-index')
      .sort(SortOrder.descending)
      .limit(1)
      .exec()

    return latest[0]
  }

  private async getLatestDST (): Promise<Token | undefined> {
    const latest = await this.model
      .query('_fixedPartitionKey')
      .eq(FIXED_PARTITION_KEY)
      .using('id-sorted-list-index')
      .sort(SortOrder.descending)
      .limit(1)
      .exec()
    if (latest.length === 0 || new BigNumber(latest[0].id).lt(DCT_ID_START)) {
      return undefined
    }

    return latest[0]
  }
}
