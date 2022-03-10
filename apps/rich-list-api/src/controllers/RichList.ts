import { AddressBalance, RichListCore } from '@defichain/rich-list-core'
import { Controller, Get, ParseIntPipe, Param, NotFoundException } from '@nestjs/common'

@Controller('/rich-list')
export class RichListController {
  constructor (
    private readonly richListCore: RichListCore
  ) {
  }

  /**
   * Retrieve top 1000 addresses with highest balance for specific asset.
   *
   * @param {number} tokenId DAT token id and `-1` represent utxo
   * @return {Promise<AddressBalance[]>}
   */
  @Get('/:tokenId')
  async get (@Param('tokenId', ParseIntPipe) tokenId: number): Promise<AddressBalance[]> {
    try {
      const richList = await this.richListCore.get(`${tokenId}`)
      return richList
    } catch (e: any) {
      if (e.message === 'InvalidTokenId') {
        throw new NotFoundException()
      }
      throw e
    }
  }
}
