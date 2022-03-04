import {
  Controller,
  Param,
  Post,
  Body,
  ForbiddenException,
  HttpCode,
  PipeTransform,
  Injectable,
  ArgumentMetadata
} from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

/**
 * MethodWhitelist is a whitelist validation pipe to check whether a plain old rpc can be
 * routed through playground. Non whitelisted method call will result in a ForbiddenException.
 *
 * Direct access to DeFiD should not be allowed, that could used used as an attack against
 * DeFi playground services. (e.g. by changing our peers)
 */
@Injectable()
export class MethodBlacklist implements PipeTransform {
  static methods: string[] = [
    'clearmempool',
    'pruneblockchain',
    'invalidateblock',
    'reconsiderblock',
    'submitblock',
    'submitheader',
    'addnode',
    'disconnectnode',
    'setban',
    'setnetworkactive',
    'clearbanned',
    'help',
    'stop',
    'uptime',
    'backupwallet',
    'createwallet',
    'dumpwallet',
    'encryptwallet',
    'importaddress',
    'importmulti',
    'importprivkey',
    'importprunedfunds',
    'importpubkey',
    'importwallet',
    'loadwallet',
    'lockunspent',
    'rescanblockchain',
    'sethdseed',
    'settxfee',
    'unloadwallet',
    'walletlock'
  ]

  transform (value: string, metadata: ArgumentMetadata): string {
    if (MethodBlacklist.methods.includes(value)) {
      throw new ForbiddenException('RPC method is blacklisted')
    }
    return value
  }
}

export class CallRequest {
  params?: any[]
}

@Controller('/v0/playground/rpc')
export class RpcController {
  constructor (private readonly client: JsonRpcClient) {
  }

  @Post('/:method')
  @HttpCode(200)
  async call (@Param('method', MethodBlacklist) method: string, @Body() call?: CallRequest): Promise<any> {
    return await this.client.call(method, call?.params ?? [], 'lossless')
  }
}
