import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { waitForCondition } from '@defichain/testcontainers'
import { InMemoryDatabase, InMemoryQueueClient } from '../persistent'
import { AddressBalance, CrawledBlock, RichListCore } from '../RichListCore'
import { StubbedWhaleApiClient } from './StubbedWhaleClient'

export function RichListCoreTest (apiClient: JsonRpcClient): RichListCore {
  return new RichListCore(
    'regtest',
    apiClient, // using defid rpc directly for test instead of exposed via whale
    new StubbedWhaleApiClient(),
    new InMemoryDatabase<AddressBalance>(),
    new InMemoryDatabase<CrawledBlock>(),
    new InMemoryDatabase<string>(),
    new InMemoryQueueClient()
  )
}

export async function waitForCatchingUp (richListCore: RichListCore, timeout: number = 30_000): Promise<void> {
  await waitForCondition(async () => !richListCore.isCatchingUp, timeout, 500, 'waitForRpc')
}
