import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common'
import { DexSwap, DexSwapMapper } from '../../models/dftx/DexSwap'
import { SortOrder } from '../../indexer/database/_abstract'

@Controller()
export class DexSwapController {
  constructor (
    private readonly dexSwapMapper: DexSwapMapper
  ) {
  }

  @Get('dexswaps')
  async listDexSwaps (
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number = 30,
    @Query('next') nextString?: string
  ): Promise<DexSwapsPaginatedResponse> {
    const { lastKey, data: swaps } = await this.dexSwapMapper.list(new Date(), SortOrder.ASC)
    return {
      swaps,
      page: {
        next: lastKey
      }
    }
  }
}

interface DexSwapsPaginatedResponse {
  swaps: DexSwap[]
  page: {
    next?: Object
  }
}
