import { Controller, Get, Query } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens'

@Controller('v1')
export class TokenController {
  @Get('gettoken')
  async getToken (
    @Query('network') network: 'mainnet' | 'testnet' | 'regtest' = 'mainnet',
    @Query('id') tokenId: string
  ): Promise<{ [key: string]: LegacyTokenData }> {
    const api = new WhaleApiClient({
      version: 'v0',
      network: network,
      url: 'https://ocean.defichain.com'
    })

    const data = await api.tokens.get(tokenId)
    return {
      [data.id]: reformatTokenData(data)
    }
  }

  @Get('listtokens')
  async listTokens (
    @Query('network') network: 'mainnet' | 'testnet' | 'regtest' = 'mainnet',
    @Query('id') tokenId: string
  ): Promise<{ [key: string]: LegacyTokenData }> {
    const api = new WhaleApiClient({
      version: 'v0',
      network: network,
      url: 'https://ocean.defichain.com'
    })

    const data: TokenData[] = await api.tokens.list(200)

    const results: { [key: string]: LegacyTokenData } = {}
    data.forEach(token => {
      results[token.id] = reformatTokenData(token)
    })
    return results
  }
}

interface LegacyTokenData {
  'symbol': string
  'symbolKey': string
  'name': string
  'decimal': number
  'limit': number
  'mintable': boolean
  'tradeable': boolean
  'isDAT': boolean
  'isLPS': boolean
  'finalized': boolean
  'isLoanToken': boolean
  'minted': number
  'creationTx': string
  'creationHeight': number
  'destructionTx': string
  'destructionHeight': number
  'collateralAddress': string | undefined
}

function reformatTokenData (data: TokenData): LegacyTokenData {
  return {
    symbol: data.symbol,
    symbolKey: data.symbolKey,
    name: data.name,
    decimal: data.decimal,
    limit: Number(data.limit),
    mintable: data.mintable,
    tradeable: data.tradeable,
    isDAT: data.isDAT,
    isLPS: data.isLPS,
    finalized: data.finalized,
    isLoanToken: data.isLoanToken,
    minted: Number(data.minted),
    creationTx: data.creation.tx,
    creationHeight: data.creation.height,
    destructionTx: data.destruction.tx,
    destructionHeight: data.destruction.height,
    collateralAddress: data.collateralAddress
  }
}
