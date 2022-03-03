import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { ApiPagedResponse } from '../module.api/_core/api.paged.response'
import { PaginationQuery } from '../module.api/_core/api.query'
import { MasternodeData } from '@defichain/whale-api-client'
import { Masternode, MasternodeMapper } from '../module.model/masternode'
import { BlockMapper } from '../module.model/block'
import { MasternodeService } from './masternode.service'

@Controller('/masternodes')
export class MasternodeController {
  constructor (
    protected readonly masternodeService: MasternodeService,
    protected readonly blockMapper: BlockMapper,
    protected readonly masternodeMapper: MasternodeMapper
  ) {
  }

  /**
   *  Paginate masternode list.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<MasternodeData>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<MasternodeData>> {
    const items = await this.masternodeMapper.query(query.size, query.next)

    const block = await this.blockMapper.getHighest()
    const height = block?.height ?? 0

    const masternodes: MasternodeData[] = await Promise.all(items
      .map(async value => await this.mapMasternodeData(value.id, value, height)))
    return ApiPagedResponse.of(masternodes, query.size, item => item.sort)
  }

  /**
   * Queries a masternode with given id
   *
   * @param {string} id
   * @return {Promise<MasternodeData>}
   */
  @Get('/:id')
  async get (@Param('id') id: string): Promise<MasternodeData> {
    const data = await this.masternodeMapper.get(id)
    if (data === undefined) {
      throw new NotFoundException('Unable to find masternode')
    }

    const block = await this.blockMapper.getHighest()
    const height = block?.height ?? 0

    return await this.mapMasternodeData(data.id, data, height)
  }

  async mapMasternodeData (id: string, info: Masternode, height: number): Promise<MasternodeData> {
    return {
      id,
      sort: info.sort,
      state: await this.masternodeService.getMasternodeState(info, height),
      mintedBlocks: info.mintedBlocks,
      owner: {
        address: info.ownerAddress
      },
      operator: {
        address: info.operatorAddress
      },
      creation: {
        height: info.creationHeight
      },
      resign: info.resignTx === undefined
        ? undefined
        : {
            tx: info.resignTx,
            height: info.resignHeight
          },
      timelock: info.timelock
    }
  }
}
