import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createToken, mintTokens, accountToAccount } from '@defichain/testing'

// globals
export let symbolDFI: string
export let symbolBTC: string
export let accountDFI: string
export let accountBTC: string
export let poolOwner: string
export let idDFI: string
export let idBTC: string
export let ICX_TAKERFEE_PER_BTC: number
export let DEX_DFI_PER_BTC_RATE: number

export class ICXSetup {
  private readonly container: MasterNodeRegTestContainer
  constructor (container: MasterNodeRegTestContainer) {
    this.container = container
    // reset global variables
    symbolDFI = ''
    symbolBTC = ''
    accountDFI = ''
    accountBTC = ''
    poolOwner = ''
    idDFI = ''
    idBTC = ''
    ICX_TAKERFEE_PER_BTC = 0
    DEX_DFI_PER_BTC_RATE = 0

    symbolDFI = 'DFI'
    symbolBTC = 'BTC'
  }

  async createAccounts (): Promise<void> {
    accountDFI = await this.container.call('getnewaddress')
    accountBTC = await this.container.call('getnewaddress')
  }

  async createBTCToken (): Promise<void> {
    const createTokenOptions = {
      name: symbolBTC,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: accountBTC
    }
    await createToken(this.container, symbolBTC, createTokenOptions)
  }

  async initializeTokensIds (): Promise<void> {
    let tokenInfo = await this.container.call('gettoken', [symbolBTC])
    idBTC = Object.keys(tokenInfo)[0]
    tokenInfo = await this.container.call('gettoken', [symbolDFI])
    idDFI = Object.keys(tokenInfo)[0]
  }

  async mintBTCtoken (amount: number): Promise<void> {
    const mintTokensOptions = {
      address: accountBTC,
      mintAmount: amount
    }
    await mintTokens(this.container, symbolBTC, mintTokensOptions)
  }

  async fundAccount (account: string, token: string, amount: number): Promise<void> {
    const payload: { [key: string]: string } = {}
    payload[account] = `${amount}@${token}`
    await this.container.call('utxostoaccount', [payload])
    await this.container.generate(1)
  }

  async createBTCDFIPool (): Promise<void> {
    poolOwner = await this.container.call('getnewaddress', ['', 'legacy'])
    await accountToAccount(this.container, symbolBTC, 1, { from: accountBTC, to: accountDFI })

    const poolPairMetadata = {
      tokenA: idBTC,
      tokenB: idDFI,
      commission: 1,
      status: true,
      ownerAddress: poolOwner,
      pairSymbol: 'BTC-DFI'
    }
    await this.container.call('createpoolpair', [poolPairMetadata, []])
    await this.container.generate(1)

    const pool = await this.container.call('getpoolpair', ['BTC-DFI'])
    const combToken = await this.container.call('gettoken', ['BTC-DFI'])
    const idDFIBTC = Object.keys(combToken)[0]
    expect(pool[idDFIBTC].idTokenA).toBe(idBTC)
    expect(pool[idDFIBTC].idTokenB).toBe(idDFI)
  }

  async addLiquidityToBTCDFIPool (amountInBTC: number, amoutInDFI: number): Promise<void> {
    const poolLiquidityMetadata: { [key: string]: string [] } = {}
    poolLiquidityMetadata[accountDFI] = [`${amountInBTC}@${symbolBTC}`, `${amoutInDFI}@${symbolDFI}`]

    await this.container.call('addpoolliquidity', [poolLiquidityMetadata, accountDFI, []])
    await this.container.generate(1)
    DEX_DFI_PER_BTC_RATE = amoutInDFI / amountInBTC
  }

  async setTakerFee (fee: number): Promise<void> {
    await this.container.call('setgov', [{ ICX_TAKERFEE_PER_BTC: fee }])
    await this.container.generate(1)
    const result: any = await this.container.call('getgov', ['ICX_TAKERFEE_PER_BTC'])
    expect(result.ICX_TAKERFEE_PER_BTC as number).toStrictEqual(fee)
    ICX_TAKERFEE_PER_BTC = result.ICX_TAKERFEE_PER_BTC as number
  }

  async closeAllOpenOffers (): Promise<void> {
    const orders = await this.container.call('icx_listorders', [])
    for (const orderTx of Object.keys(orders).splice(1)) {
      const offers = await this.container.call('icx_listorders', [{ orderTx: orderTx }])
      for (const offerTx of Object.keys(offers).splice(1)) {
        if (offers[offerTx].status === 'OPEN') {
          await this.container.call('icx_closeoffer', [offerTx])
        }
      }
    }
    await this.container.generate(1)
  }
}
