import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DeFiDCache } from './cache/defid.cache'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { AssetBreakdownInfo, MemberInfo } from '@defichain/whale-api-client/dist/api/consortium'
import BigNumber from 'bignumber.js'

@Injectable()
export class ConsortiumService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    private readonly defidCache: DeFiDCache,
    protected readonly cache: SemaphoreCache
  ) {}

  private pushToAssetBreakdownInfo (memberInfo: MemberInfo[], tokens: any[], assetBreakdownInfo: AssetBreakdownInfo[], key: string, value: string): void {
    const tokenId = key.split('/')[4]
    const memberId = key.split('/')[5]
    const member = memberInfo.find(am => am.id === memberId)
    const type = key.split('/')[6] as 'burnt' | 'minted' | 'supply'
    const token = tokens?.find(t => t.id === tokenId)
    const val = new BigNumber(value).toFixed(+token.decimal.toString())

    const memberObj = {
      id: memberId,
      name: member?.name ?? '',
      backingAddress: member?.backingAddress ?? '',
      minted: '-1',
      backed: '-1',
      supply: '-1',
      burnt: '-1'
    }
    memberObj[type] = val

    const existingABI = assetBreakdownInfo.find(abi => abi.tokenSymbol === token.symbol)
    if (existingABI !== undefined) {
      const existingMember = existingABI.memberInfo.find(mi => mi.id === memberId)
      if (existingMember !== undefined) {
        existingMember[type] = val
      } else {
        existingABI.memberInfo.push(memberObj)
      }
    } else {
      assetBreakdownInfo.push({
        tokenSymbol: token.symbol,
        memberInfo: [memberObj]
      })
    }
  }

  async getAssetBreakdown (): Promise<AssetBreakdownInfo[]> {
    return await this.cache.get<AssetBreakdownInfo[]>('CONSORTIUM_ASSET_BREAKDOWN', async () => {
      const attrs = (await this.rpcClient.masternode.getGov('ATTRIBUTES')).ATTRIBUTES

      const keys: string[] = Object.keys(attrs)
      const values: string[] = Object.values(attrs)
      const assetBreakdownInfo: AssetBreakdownInfo[] = []
      const memberInfo: MemberInfo[] = []

      const tokens = await this.defidCache.getAllTokenInfo() as any[]

      keys.forEach((key, i) => {
        if (/^v0\/consortium\/\d+\/members$/.exec(key) !== null) {
          const membersPerToken = JSON.parse(values[i])
          const memberIds = Object.keys(membersPerToken)
          const memberDetails = Object.values(membersPerToken) as any

          memberIds.forEach((mi, j) => {
            if (memberInfo.find(am => am.id === mi) === undefined) {
              memberInfo.push({
                id: mi,
                backingAddress: memberDetails[j].backingId,
                name: memberDetails[j].name
              })
            }
          })
        }

        if (
          /^v0\/live\/economy\/consortium_members\/\d+\/\d+\/minted$/.exec(key) !== null ||
          /^v0\/live\/economy\/consortium_members\/\d+\/\d+\/burnt$/.exec(key) !== null ||
          /^v0\/live\/economy\/consortium_members\/\d+\/\d+\/supply$/.exec(key) !== null
        ) {
          this.pushToAssetBreakdownInfo(memberInfo, tokens, assetBreakdownInfo, key, values[i])
        }
      })

      return assetBreakdownInfo
    }, {
      ttl: 600 // 10 minutes
    }) as AssetBreakdownInfo[]
  }
}
