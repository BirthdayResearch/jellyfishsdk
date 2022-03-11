import { Schema } from 'dynamoose'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel, Model } from 'nestjs-dynamoose'

export interface DexSwapKey {
  id: string // ----------------| partition / hash key; the transaction id of fixed length 64
}

interface DexSwap extends DexSwapKey {
  id: string
  timestamp: string
  from: DexSwapFromTo
  to: DexSwapFromTo
}

interface DexSwapFromTo {
  amount: string
  symbol: string
}

export const BlockSchema = new Schema({
  id: String,
  timestamp: String,
  from: {
    type: Object,
    schema: {
      amount: String,
      symbol: String
    }
  },
  to: {
    type: Object,
    schema: {
      amount: String,
      symbol: String
    }
  }
})

@Injectable()
export class DexSwapService {
  constructor (
    @InjectModel('DexSwap')
    private readonly model: Model<DexSwap, DexSwapKey>
  ) {
  }

  async upsert (dexSwap: DexSwap): Promise<void> {
    await this.model.create(dexSwap, { overwrite: true, return: 'document' })
  }

  async get (id: string): Promise<DexSwap> {
    return await this.model.get({ id })
  }

  async delete (id: string): Promise<void> {
    const dexSwap = await this.model.get({ id })
    if (dexSwap === undefined) {
      throw new NotFoundException('Attempt to delete non-existent dexSwap')
    }
    await this.model.delete({ id })
  }
}
