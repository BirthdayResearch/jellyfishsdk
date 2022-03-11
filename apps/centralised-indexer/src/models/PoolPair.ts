import { Schema } from 'dynamoose'
import { Injectable } from '@nestjs/common'
import { InjectModel, Model } from 'nestjs-dynamoose'

export interface PoolPairKey {
  id: string
}

export interface PoolPair extends PoolPairKey {
  poolPairId: string // ------| poolPairId (decimal encoded integer as string)
  pairSymbol: string // ------| string
  name: string // ------------| string
  tokenA: {
    id: number // ------------| numerical id
    symbol: string // --------| string
  }
  tokenB: {
    id: number // ------------| numerical id
    symbol: string // --------| string
  }
  status: boolean // ---------| active / not active
  commission: string // ------| bignumber
  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

export const PoolPairSchema = new Schema({
  poolPairId: String, // ------| poolPairId (decimal encoded integer as string)
  pairSymbol: String, // ------| string
  name: String, // ------------| string
  tokenA: {
    type: Object,
    schema: {
      id: Number, // ----------| numerical id
      symbol: String // -------| string
    }
  },
  tokenB: {
    type: Object,
    schema: {
      id: Number, // ----------| numerical id
      symbol: String // -------| string
    }
  },
  status: Boolean, // ---------| active / not active
  commission: String, // -------| bignumber
  block: {
    type: Object,
    schema: {
      hash: String,
      height: Number,
      time: Number,
      medianTime: Number
    }
  }
})

@Injectable()
export class PoolPairService {
  constructor (
    @InjectModel('PoolPair')
    private readonly model: Model<PoolPair, PoolPairKey>
  ) {
  }

  async upsert (): Promise<void> {

  }

  async get (id: string): Promise<void> {

  }

  async getByTokenIds (tokenA: number, tokenB: number): Promise<void> {

  }

  async delete (id: string): Promise<void> {

  }
}
