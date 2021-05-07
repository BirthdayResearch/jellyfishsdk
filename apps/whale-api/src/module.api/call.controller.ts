import {
  Controller,
  Param,
  Post,
  Body,
  ForbiddenException,
  HttpCode,
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  UseGuards, UseInterceptors
} from '@nestjs/common'

import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { NetworkGuard } from '@src/module.api/commons/network.guard'
import { ResponseInterceptor } from '@src/module.api/commons/response.interceptor'
import { ExceptionInterceptor } from '@src/module.api/commons/exception.interceptor'

/**
 * MethodWhitelist is a whitelist validation pipe to check
 * whether a plain old rpc can be routed through whale.
 * Non whitelisted method call will result in a ForbiddenException.
 *
 * Direct access to DeFiD should not be allowed,
 * that could used used as an attack against DeFi whale services.
 * (by changing our peers)
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
@UseGuards(NetworkGuard)
@UseInterceptors(ResponseInterceptor, ExceptionInterceptor)
export class CallController {
  constructor (private readonly client: JsonRpcClient) {
  }

  @Post('/:method')
  @HttpCode(200)
  async call (@Param('method', MethodWhitelist) method: string, @Body() callDto?: CallDto): Promise<any> {
    return await this.client.call(method, callDto?.params ?? [], 'lossless')
  }
}
