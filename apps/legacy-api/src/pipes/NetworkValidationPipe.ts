import {
  ArgumentMetadata,
  HttpException,
  Injectable,
  PipeTransform
} from '@nestjs/common'
import { NetworkName } from '@defichain/jellyfish-network'

@Injectable()
export class NetworkValidationPipe implements PipeTransform {
  private static readonly VALID_NETWORKS: Set<undefined | NetworkName> = new Set([
    undefined, // defaults to 'mainnet'
    'mainnet',
    'testnet',
    'regtest'
  ])

  transform (value: any, metadata: ArgumentMetadata): any {
    if (NetworkValidationPipe.VALID_NETWORKS.has(value)) {
      return value
    }
    throw new InvalidNetworkException()
  }
}

export class InvalidNetworkException extends HttpException {
  constructor () {
    super({
      statusCode: 404,
      message: 'Not Found'
    }, 404)
  }
}
