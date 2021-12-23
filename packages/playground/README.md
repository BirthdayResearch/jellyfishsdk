# `@defichain/playground`

> This package is not published, for internal use within `@defichain-apps/ocean-api` only.

`@defichain/playground` is a specialized testing blockchain isolated from MainNet for testing DeFi applications. Assets
are not real, they can be minted by anyone. Blocks are configured to generate every 3 seconds, the chain can reset
anytime.

A bot-like design centers the playground as a mechanism that allows bootstrapping with an interval cycle. This allows
the developer to mock any behaviors they want with a simulated testing blockchain.

## Playground Design

Playground follows the chain of responsibility pattern (think Filter in ExpressJS). Each bot has its own concern that it
manages; it can be generating block, publishing oracle data, or setting up foundation auth. Each bot enforced with
`AbstractBot` abstraction comes with `bot.bootstrap()` and `bot.cycle()` method.

```typescript
class AbstractBot {
  constructor (
    protected readonly apiClient: ApiClient,
    protected readonly logger: BotLogger
  ) {
  }

  bootstrap (): Promise<void> {
  }

  cycle (nextBlockCount: number): Promise<void> {
  }
}
```

## Playground Setup

### Initialize

```typescript
const logger = {
  info: (action: string, message: string) => console.log(`...`)
}
const rpc = new JsonRpcClient()
const playground = new Playground(rpc, logger)
```

### Boostrap

```typescript
await playground.bootstrap()
```

### Run each cycle and your defined interval

```typescript
await playground.cycle()
```
