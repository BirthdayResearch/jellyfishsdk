import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { waitForCondition } from '@defichain/testcontainers'
import { InMemoryDatabase, InMemoryQueueClient } from '../src/lib'
import { CrawledBlock, RichListCore } from '../src/RichListCore'
import { RichListItem } from '../src/types'
import { StubbedWhaleApiClient } from './StubbedWhaleClient'

export function RichListCoreTest (apiClient: JsonRpcClient): RichListCore {
  return new RichListCore(
    'regtest',
    apiClient,
    new StubbedWhaleApiClient(),
    new InMemoryDatabase<RichListItem>(),
    new InMemoryDatabase<CrawledBlock>(),
    new InMemoryDatabase<string>(),
    new InMemoryQueueClient()
  )
}

export async function waitForCatchingUp (richListCore: RichListCore, timeout: number = 30_000): Promise<void> {
  await waitForCondition(async () => !richListCore.isCatchingUp, timeout, 500, 'waitForRpc')
}
