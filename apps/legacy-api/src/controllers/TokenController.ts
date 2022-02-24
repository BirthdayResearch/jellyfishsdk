import { Controller, Get, Query } from '@nestjs/common'
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { NetworkValidationPipe } from '../pipes/NetworkValidationPipe'
import { SupportedNetwork } from '../common/networks'

@Controller('v1')
export class TokenController {
  constructor (private readonly whaleApiClientProvider: WhaleApiClientProvider) {}

  @Get('gettoken')
  async getToken (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet',
    @Query('id') tokenId: string
  ): Promise<{ [key: string]: LegacyTokenData }> {
    const api = this.whaleApiClientProvider.getClient(network)

    const data = await api.tokens.get(tokenId)
    return {
      [data.id]: reformatTokenData(data)
    }
  }

  @Get('listtokens')
  async listTokens (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet',
    @Query('id') tokenId: string
  ): Promise<{ [key: string]: LegacyTokenData }> {
    const api = this.whaleApiClientProvider.getClient(network)

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
