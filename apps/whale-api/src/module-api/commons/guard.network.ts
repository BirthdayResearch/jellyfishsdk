import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common'
import { Observable } from 'rxjs'
import { ConfigService } from '@nestjs/config'

/**
 * Whale endpoints are exposed as /v1/:network/...
 * Each whale server can only run a single network for separation of concerns.
 * This provides global request guard to ensure request are routed to the correct endpoint.
 * Incorrect network will raise NotFoundException and handled as a 404 response.
 */
@Injectable()
export class NetworkGuard implements CanActivate {
  static available: string[] = [
    'mainnet',
    'testnet',
    'regtest'
  ]

  private readonly network: string

  constructor (private readonly configService: ConfigService) {
    const network = configService.get<string>('network')
    if (network === undefined || !NetworkGuard.available.includes(network)) {
      throw new Error('bootstrapping error: missing config in configuration.ts - network is not configured')
    }
    this.network = network
  }

  canActivate (context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest()
    if (request.params.network !== this.network) {
      throw new NotFoundException('Network not found')
    }
    return true
  }
}
