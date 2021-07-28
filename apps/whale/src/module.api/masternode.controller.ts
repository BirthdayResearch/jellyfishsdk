import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { MasternodeData } from '@whale-api-client/api/masternodes'
import { MasternodeInfo, MasternodePagination } from '@defichain/jellyfish-api-core/dist/category/masternode'

@Controller('/masternodes')
export class MasternodesController {
  constructor (
    protected readonly client: JsonRpcClient
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
    const options: MasternodePagination = {
      including_start: query.next === undefined,
      limit: query.size,
      start: query.next
    }

    const data = await this.client.masternode.listMasternodes(options, true)
    const masternodes: MasternodeData[] = Object.entries(data)
      .map(([id, value]): MasternodeData => mapMasternodeData(id, value))
      .sort((a, b) => a.id.localeCompare(b.id))
    return ApiPagedResponse.of(masternodes, query.size, item => item.id)
  }

  /**
   * Queries a masternode with given id
   *
   * @param {string} id
   * @return {Promise<MasternodeData>}
   */
  @Get('/:id')
  async get (@Param('id') id: string): Promise<MasternodeData> {
    try {
      const data = await this.client.masternode.getMasternode(id)
      return mapMasternodeData(id, data[Object.keys(data)[0]])
    } catch (err) {
      if (err?.payload?.message === 'Masternode not found') {
        throw new NotFoundException('Unable to find masternode')
      } else {
        throw new BadRequestException(err)
      }
    }
  }
}

function mapMasternodeData (id: string, info: MasternodeInfo): MasternodeData {
  return {
    id,
    state: info.state,
    mintedBlocks: info.mintedBlocks,
    owner: {
      address: info.ownerAuthAddress
    },
    operator: {
      address: info.operatorAuthAddress
    },
    creation: {
      height: info.creationHeight
    },
    resign: {
      tx: info.resignTx,
      height: info.resignHeight
    }
  }
}
