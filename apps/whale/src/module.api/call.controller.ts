import { Controller, Param, Post, Body, ForbiddenException, HttpCode, PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common'

import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

/**
 * MethodWhitelist is a whitelist validation pipe to check
 * whether a plain old rpc can be routed through whale.
 * Non whitelisted method call will result in a ForbiddenException.
 */
@Injectable()
export class MethodWhitelist implements PipeTransform {
  static methods = [
    'getblockchaininfo',
    'getblockhash',
    'getblockcount',
    'getblock'
  ]

  transform (value: string, metadata: ArgumentMetadata): string {
    if (!MethodWhitelist.methods.includes(value)) {
      throw new ForbiddenException('RPC method not whitelisted')
    }
    return value
  }
}

/**
 * Call Data Transfer Object
 */
export class CallDto {
  params?: any[]
}

@Controller('/v1/:network/call')
export class CallController {
  constructor (private readonly client: JsonRpcClient) {
  }

  @Post('/:method')
  @HttpCode(200)
  async call (@Param('method', MethodWhitelist) method: string, @Body() callDto?: CallDto): Promise<any> {
    return await this.client.call(method, callDto?.params ?? [], 'lossless')
  }
}
