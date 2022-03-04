import { AddressBalance, RichListCore } from '@defichain/rich-list-core'
import { Controller, Get, ParseIntPipe, Param } from '@nestjs/common'

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
    return await this.richListCore.get(`${tokenId}`)
  }
}
