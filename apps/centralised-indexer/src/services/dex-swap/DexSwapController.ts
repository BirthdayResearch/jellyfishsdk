import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common'
import { DexSwap, DexSwapService, Sort } from '../../models/dftx/DexSwap'

@Controller()
export class DexSwapController {
  constructor (
    private readonly dexSwapService: DexSwapService
  ) {
  }

  @Get('dexswaps')
  async listDexSwaps (
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number = 30,
    @Query('next') nextString?: string
  ): Promise<DexSwapsPaginatedResponse> {
    const nextToken = (nextString !== undefined)
      ? JSON.parse(Buffer.from(nextString, 'base64url').toString())
      : undefined
    const { dexSwaps, lastKey } = await this.dexSwapService.list(new Date(), Sort.asc, { limit, next: nextToken })

    return {
      swaps: dexSwaps,
      page: {
        next: lastKey !== undefined ? base64encode(lastKey) : {}
      }
    }
  }
}

function base64encode (object: Object): string {
  return Buffer.from(JSON.stringify(object), 'utf8').toString('base64url')
}

interface DexSwapsPaginatedResponse {
  swaps: DexSwap[]
  page?: {
    next: Object
  }
}
