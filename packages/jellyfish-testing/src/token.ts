import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from "@defichain/testcontainers";
import { JsonRpcClient } from "@defichain/jellyfish-api-jsonrpc";

export class TestingToken {
  constructor (
    public readonly container: MasterNodeRegTestContainer,
    public readonly jsonRpc: JsonRpcClient
  ) {
  }

  async create (options: TestingTokenCreate): Promise<string> {
    await this.container.waitForWalletBalanceGTE(101) // token creation fee

    return await this.jsonRpc.token.createToken({
      name: options.symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: await this.container.getNewAddress(),
      ...options
    })
  }

  async dfi (options: TestingTokenMint): Promise<string> {
    const { amount, symbol } = options
    await this.container.waitForWalletBalanceGTE(new BigNumber(amount).toNumber())

    const address = await this.container.getNewAddress()
    const account = `${new BigNumber(amount).toFixed(8)}@${symbol}`
    return await this.jsonRpc.account.utxosToAccount({ [address]: account })
  }

  async mint (options: TestingTokenMint): Promise<string> {
    const { amount, symbol } = options
    const account = `${new BigNumber(amount).toFixed(8)}@${symbol}`
    return await this.jsonRpc.token.mintTokens(account)
  }

  async send (options: TestingTokenSend): Promise<string> {
    const { address, amount, symbol } = options
    const account = `${new BigNumber(amount).toFixed(8)}@${symbol}`
    const to = { [address]: [account] }
    return await this.jsonRpc.account.sendTokensToAddress({}, to)
  }
}

interface TestingTokenCreate {
  symbol: string
  name?: string
  isDAT?: boolean
  mintable?: boolean
  tradeable?: boolean
  collateralAddress?: string
}

interface TestingTokenMint {
  amount: number | string
  symbol: string
}

interface TestingTokenSend {
  address: string
  amount: number | string
  symbol: string
}
