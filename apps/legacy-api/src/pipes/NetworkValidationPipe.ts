import {
  ArgumentMetadata,
  HttpException,
  Injectable,
  PipeTransform
} from '@nestjs/common'

export type SupportedNetwork = 'mainnet' | 'testnet' | 'devnet' | 'regtest' | 'changi'

@Injectable()
export class NetworkValidationPipe implements PipeTransform {
  private static readonly VALID_NETWORKS: Set<undefined | SupportedNetwork> = new Set([
    undefined, // defaults to 'mainnet'
    'mainnet',
    'testnet',
    'devnet',
    'regtest',
    'changi'
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
