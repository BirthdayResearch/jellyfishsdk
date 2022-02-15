import { WhaleApiClientProvider } from '../../src/providers/WhaleApiClientProvider'
import { Test } from '@nestjs/testing'

describe('WhaleApiClientProvider', () => {
  let whaleApiClientProvider: WhaleApiClientProvider

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [WhaleApiClientProvider]
    }).compile()

    whaleApiClientProvider = moduleRef.get(WhaleApiClientProvider)
  })

  it('should cache and return same client instance for the same network', () => {
    {
      const first = whaleApiClientProvider.getClient('mainnet')
      const second = whaleApiClientProvider.getClient('mainnet')
      expect(first === second) // points to the same object
        .toStrictEqual(true)
    }
    {
      const first = whaleApiClientProvider.getClient('testnet')
      const second = whaleApiClientProvider.getClient('testnet')
      expect(first === second) // points to the same object
        .toStrictEqual(true)
    }
    {
      const first = whaleApiClientProvider.getClient('regtest')
      const second = whaleApiClientProvider.getClient('regtest')
      expect(first === second) // points to the same object
        .toStrictEqual(true)
    }
  })

  it('should return different clients for different networks', () => {
    const mainnet = whaleApiClientProvider.getClient('mainnet')
    const testnet = whaleApiClientProvider.getClient('testnet')
    const regtest = whaleApiClientProvider.getClient('regtest')

    expect(mainnet).not.toStrictEqual(testnet)
    expect(mainnet).not.toStrictEqual(regtest)
    expect(testnet).not.toStrictEqual(regtest)
  })
})
