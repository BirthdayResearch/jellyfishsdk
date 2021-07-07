import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import BigNumber from 'bignumber.js'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Poolpair', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(200)
  })

  afterAll(async () => {
    await container.stop()
  })

  async function setup (symbolA: string, symbolB: string): Promise<string> {
    const addressA = await getNewAddress(container)
    const addressB = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, symbolA)
    await mintTokens(container, symbolA, { address: addressA })
    await createToken(container, symbolB)
    await mintTokens(container, symbolB, { address: addressB })
    await createPoolPair(container, symbolA, symbolB)
    await addPoolLiquidity(container, {
      tokenA: symbolA,
      amountA: 100,
      tokenB: symbolB,
      amountB: 100,
      shareAddress: poolLiquidityAddress
    })

    return poolLiquidityAddress
  }

  it('should removeLiquidity', async () => {
    const poolLiquidityAddress = await setup('DOG', 'FOX')

    const poolPairBefore = (await container.call('getpoolpair', ['DOG-FOX']))['3']
    const totalLiquidityBefore = new BigNumber(poolPairBefore.totalLiquidity)
    const poolLiquidityAccountBefore = await container.call('getaccount', [poolLiquidityAddress]) // 44.72135954
    expect(poolLiquidityAccountBefore.length).toStrictEqual(1)

    const fee = new BigNumber('0.00001')
    expect(poolLiquidityAccountBefore[0]).toStrictEqual(`${totalLiquidityBefore.minus(fee).toFixed(8)}@DOG-FOX`) // 44.72134954@DOG-FOX

    const hash = await client.poolpair.removePoolLiquidity(poolLiquidityAddress, '13@DOG-FOX')
    expect(typeof hash).toStrictEqual('string')
    expect(hash.length).toStrictEqual(64)
    await container.generate(1)

    const poolPairAfter = (await container.call('getpoolpair', ['DOG-FOX']))['3']
    const totalLiquidityAfter = new BigNumber(poolPairAfter.totalLiquidity)
    expect(totalLiquidityBefore.minus(totalLiquidityAfter).toString()).toStrictEqual('13')

    const poolLiquidityAccountAfter = await container.call('getaccount', [poolLiquidityAddress])
    expect(poolLiquidityAccountAfter.length).toStrictEqual(3)

    const dogLiquidityDiff = new BigNumber(poolPairBefore.reserveA).minus(poolPairAfter.reserveA)
    const foxLiquidityDiff = new BigNumber(poolPairBefore.reserveB).minus(poolPairAfter.reserveB)
    expect(poolLiquidityAccountAfter[0]).toStrictEqual(`${dogLiquidityDiff.toFixed(8)}@DOG`)
    expect(poolLiquidityAccountAfter[1]).toStrictEqual(`${foxLiquidityDiff.toFixed(8)}@FOX`)
    expect(poolLiquidityAccountAfter[2]).toStrictEqual(`${totalLiquidityAfter.minus(fee).toFixed(8)}@DOG-FOX`)
  })

  it('should removeLiquidity with utxos', async () => {
    const poolLiquidityAddress = await setup('APE', 'BEE')
    await container.fundAddress(poolLiquidityAddress, 25)
    const utxos = await container.call('listunspent')
    const utxo = utxos.find((utxo: any) => utxo.address === poolLiquidityAddress)

    const txid = await client.poolpair.removePoolLiquidity(
      poolLiquidityAddress, '4@APE-BEE', { utxos: [{ txid: utxo.txid, vout: utxo.vout }] }
    )
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)

    await container.generate(1)

    const rawtx = await container.call('getrawtransaction', [txid, true])

    // the utxo input will be added into removeLiquidity tx vin
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
  })

  it('should removeLiquidity failed with utxos as tx input is not from account owner', async () => {
    const poolLiquidityAddress = await setup('ELF', 'GOR')
    const otherAddress = await getNewAddress(container)

    await container.fundAddress(otherAddress, 25)

    const utxos = await container.call('listunspent')
    const utxo = utxos.find((utxo: any) => utxo.address === otherAddress)
    const promise = client.poolpair.removePoolLiquidity(
      poolLiquidityAddress, '4@ELF-GOR', { utxos: [{ txid: utxo.txid, vout: utxo.vout }] }
    )

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('tx must have at least one input from account owner')
  })
})
