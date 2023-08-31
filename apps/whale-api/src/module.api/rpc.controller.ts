import {
  ArgumentMetadata,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Injectable,
  Param,
  PipeTransform,
  Post
} from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiRawResponse } from './_core/api.response'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { Transform } from 'class-transformer'

/**
 * MethodWhitelist is a whitelist validation pipe to check
 * whether a plain old rpc can be routed through whale.
 * Non whitelisted method call will result in a ForbiddenException.
 *
 * Direct access to DeFiD should not be allowed,
 * that could be used as an attack against DeFi whale services.
 * (by changing our peers)
 */
@Injectable()
export class MethodWhitelist implements PipeTransform {
  static methods = [
    'getblockchaininfo',
    'getblockhash',
    'getblockcount',
    'getblock',
    'getblockstats',
    'getgov',
    'validateaddress',
    'listcommunitybalances',
    'getaccounthistory',
    'getfutureswapblock',
    'getpendingfutureswaps',
    'sendrawtransaction',
    'getrawtransaction',
    'getgovproposal',
    'listgovproposals',
    'listgovproposalvotes',
    'vmmap'
  ]

  transform (value: string, metadata: ArgumentMetadata): string {
    if (!MethodWhitelist.methods.includes(value)) {
      throw new ForbiddenException('RPC method not whitelisted')
    }
    return value
  }
}

export class JSONRPCParams {
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => value !== undefined ? value : [])
  params!: any[]
}

export class JSONRPC {
  @IsString()
  @IsNotEmpty()
  @IsIn(MethodWhitelist.methods, {
    message: 'RPC method not whitelisted'
  })
  method!: string

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => value !== undefined ? value : [])
  params!: any[]
}

@Controller('/rpc')
export class RpcController {
  constructor (private readonly client: JsonRpcClient) {
  }

  @Post()
  async post (@Body() rpc: JSONRPC): Promise<ApiRpcResponse> {
    try {
      const result = await this.client.call(rpc.method, rpc.params, 'lossless')
      return new ApiRpcResponse(result)
    } catch (err: any) {
      if (err instanceof RpcApiError || err.payload !== undefined) {
        return new ApiRpcResponse(null, err.payload)
      }

      throw err
    }
  }

  @Post('/:method')
  @HttpCode(200)
  async call (@Param('method', MethodWhitelist) method: string, @Body() callDto?: JSONRPCParams): Promise<any> {
    return await this.client.call(method, callDto?.params ?? [], 'lossless')
  }
}

class ApiRpcResponse extends ApiRawResponse {
  constructor (
    public readonly result: any | null,
    public readonly error: any = null,
    public readonly id: null = null
  ) {
    super()
  }
}
