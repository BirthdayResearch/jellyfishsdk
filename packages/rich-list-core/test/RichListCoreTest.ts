import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RichListItem } from '@defichain/rich-list-api-client'
import { waitForCondition } from '@defichain/testcontainers'
import { InMemoryDatabase, StubbedQueueClient } from '../src/lib'
import { CrawledBlock, RichListCore } from '../src/RichListCore'

export function RichListCoreTest (apiClient: JsonRpcClient): RichListCore {
  return new RichListCore(
    'regtest',
    apiClient,
    new InMemoryDatabase<RichListItem>(),
    new InMemoryDatabase<CrawledBlock>(),
    new InMemoryDatabase<string>(),
    new StubbedQueueClient()
  )
}

export async function waitForCatchingUp (richListCore: RichListCore, timeout: number = 30_000): Promise<void> {
  await waitForCondition(async () => !richListCore.isCatchingUp, timeout, 500, 'waitForRpc')
}
