import { Controller } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

@Controller('/loan')
export class LoanController {
  constructor (private readonly client: JsonRpcClient) {
  }
}
