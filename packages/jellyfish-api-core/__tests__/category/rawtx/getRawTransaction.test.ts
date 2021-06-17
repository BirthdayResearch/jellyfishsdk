import { RawTransaction } from '@defichain/jellyfish-api-core/category/rawtx'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'

describe('RawTransaction', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function createToken (symbol: string): Promise<string> {
    const address = await container.call('getnewaddress')
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    const txid = await container.call('createtoken', [metadata])
    await container.generate(1)
    return txid
  }

  it('should getRawTransaction with verbose true to get informative json object', async () => {
    const txid = await createToken('ANT')

    const data: RawTransaction = await client.rawtx.getRawTransaction(txid, true)
    expect(typeof data.txid).toStrictEqual('string')
    expect(typeof data.hash).toStrictEqual('string')
    expect(typeof data.version).toStrictEqual('number')
    expect(typeof data.size).toStrictEqual('number')
    expect(typeof data.vsize).toStrictEqual('number')
    expect(typeof data.weight).toStrictEqual('number')
    expect(typeof data.locktime).toStrictEqual('number')
    expect(typeof data.vin[0].txid).toStrictEqual('string')
    expect(typeof data.vin[0].vout).toStrictEqual('number')
    expect(typeof data.vin[0].scriptSig.asm).toStrictEqual('string')
    expect(typeof data.vin[0].scriptSig.hex).toStrictEqual('string')
    expect(typeof data.vin[0].sequence).toStrictEqual('number')
    expect(typeof data.vout[0].value).toStrictEqual('number')
    expect(typeof data.vout[0].n).toStrictEqual('number')
    expect(typeof data.vout[0].scriptPubKey.asm).toStrictEqual('string')
    expect(typeof data.vout[0].scriptPubKey.hex).toStrictEqual('string')
    expect(typeof data.vout[0].scriptPubKey.type).toStrictEqual('string')
    expect(typeof data.vout[0].tokenId).toStrictEqual('number')
    expect(typeof data.hex).toStrictEqual('string')
    expect(typeof data.blockhash).toStrictEqual('string')
    expect(typeof data.confirmations).toStrictEqual('number')
    expect(typeof data.time).toStrictEqual('number')
    expect(typeof data.blocktime).toStrictEqual('number')
  })

  it('should getRawTransaction with verbose false in hex-encoded format', async () => {
    const txid = await createToken('BAT')

    const hex = await client.rawtx.getRawTransaction(txid, false)
    expect(typeof hex).toStrictEqual('string')
  })

  it('should getRawTransaction with verbose true and specified blockHash', async () => {
    const txid = await createToken('CAT')

    const count = await container.call('getblockcount')
    const hash = await container.call('getblockhash', [count])
    const data: RawTransaction = await client.rawtx.getRawTransaction(txid, true, hash)
    expect(typeof data.in_active_chain).toStrictEqual('boolean')
    expect(typeof data.txid).toStrictEqual('string')
    expect(typeof data.hash).toStrictEqual('string')
    expect(typeof data.version).toStrictEqual('number')
    expect(typeof data.size).toStrictEqual('number')
    expect(typeof data.vsize).toStrictEqual('number')
    expect(typeof data.weight).toStrictEqual('number')
    expect(typeof data.locktime).toStrictEqual('number')
    expect(typeof data.vin[0].txid).toStrictEqual('string')
    expect(typeof data.vin[0].vout).toStrictEqual('number')
    expect(typeof data.vin[0].scriptSig.asm).toStrictEqual('string')
    expect(typeof data.vin[0].scriptSig.hex).toStrictEqual('string')
    expect(typeof data.vin[0].sequence).toStrictEqual('number')
    expect(typeof data.vout[0].value).toStrictEqual('number')
    expect(typeof data.vout[0].n).toStrictEqual('number')
    expect(typeof data.vout[0].scriptPubKey.asm).toStrictEqual('string')
    expect(typeof data.vout[0].scriptPubKey.hex).toStrictEqual('string')
    expect(typeof data.vout[0].scriptPubKey.type).toStrictEqual('string')
    expect(typeof data.vout[0].tokenId).toStrictEqual('number')
    expect(typeof data.hex).toStrictEqual('string')
    expect(typeof data.blockhash).toStrictEqual('string')
    expect(typeof data.confirmations).toStrictEqual('number')
    expect(typeof data.time).toStrictEqual('number')
    expect(typeof data.blocktime).toStrictEqual('number')
  })

  it('should be failed as specified hash which does not come with txid', async () => {
    const txid = await createToken('DOG')

    const count = await container.call('getblockcount')
    const wrongHash = await container.call('getblockhash', [count - 1])
    const promise = client.rawtx.getRawTransaction(txid, true, wrongHash)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('No such transaction found in the provided block. Use gettransaction for wallet transactions.')
  })

  it('should getRawTransaction with verbose true and specified blockHash in hex-encoded format', async () => {
    const txid = await createToken('ELF')

    const count = await container.call('getblockcount')
    const hash = await container.call('getblockhash', [count])
    const hex: string = await client.rawtx.getRawTransaction(txid, false, hash)
    expect(typeof hex).toStrictEqual('string')
  })
})
