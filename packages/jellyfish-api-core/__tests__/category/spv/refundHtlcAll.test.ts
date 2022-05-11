import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { BigNumber, RpcApiError } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import { ListHtlcsOutputsResult, ReceivedByAddressInfo } from '@defichain/jellyfish-api-core/dist/category/spv'

describe('Spv', () => {
  let testing: Testing
  let container: MasterNodeRegTestContainer

  beforeEach(async () => {
    testing = Testing.create(new MasterNodeRegTestContainer())
    container = testing.container
    await container.start()
    await container.spv.fundAddress(await container.call('spv_getnewaddress')) // Funds 1 BTC
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should refundHtlcAll', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc1 = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])
    const htlc2 = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    const fund1 = await container.call('spv_sendtoaddress', [htlc1.address, 0.1]) // Funds HTLC address
    const fund2 = await container.call('spv_sendtoaddress', [htlc2.address, 0.2])
    await container.spv.increaseSpvHeight(10)

    const destinationAddress = await container.call('spv_getnewaddress')
    const results = await testing.rpc.spv.refundHtlcAll(destinationAddress) // This refund should only happen after timeout threshold set in createHtlc. See https://en.bitcoin.it/wiki/BIP_0199
    expect(results.length).toStrictEqual(1)
    for (const txid of results) {
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
    }

    /**
     * Assert that refund happened
     * confirms at 11 as it `increaseSpvHeight` increased height by 10,
     * and refund action adds 1.
     */
    const outputList: ListHtlcsOutputsResult[] = await container.call('spv_listhtlcoutputs')
    expect(outputList.length).toStrictEqual(2)
    const output1 = outputList.find(({ txid }: { txid: string }) => txid === fund1.txid)
    const output2 = outputList.find(({ txid }: { txid: string }) => txid === fund2.txid)
    expect(output1).toStrictEqual({
      txid: fund1.txid,
      vout: expect.any(Number),
      amount: new BigNumber(0.1).toNumber(),
      address: htlc1.address,
      confirms: 11,
      spent: {
        txid: results[0],
        confirms: 1
      }
    })
    expect(output2).toStrictEqual({
      txid: fund2.txid,
      vout: expect.any(Number),
      amount: new BigNumber(0.2).toNumber(),
      address: htlc2.address,
      confirms: 11,
      spent: {
        txid: results[0],
        confirms: 1
      }
    })

    /**
     * Assert that the destination address received the refund
     */
    const listReceivingAddresses: ReceivedByAddressInfo[] = await container.call('spv_listreceivedbyaddress')

    const receivingAddress = listReceivingAddresses.find(l => l.address === destinationAddress)
    expect(receivingAddress?.address).toStrictEqual(destinationAddress)
    expect(receivingAddress?.txids.some((txid: string) => txid === results[0])).toStrictEqual(true)
  })

  it('should refundHtlcAll for expired only', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc1 = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])
    const htlc2 = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '50'])

    const fund1 = await container.call('spv_sendtoaddress', [htlc1.address, 0.1]) // Funds HTLC address
    const fund2 = await container.call('spv_sendtoaddress', [htlc2.address, 0.2])
    await container.spv.increaseSpvHeight(10)

    const destinationAddress = await container.call('spv_getnewaddress')
    const results = await testing.rpc.spv.refundHtlcAll(destinationAddress) // This refund should only happen after timeout threshold set in createHtlc. See https://en.bitcoin.it/wiki/BIP_0199
    expect(results.length).toStrictEqual(1)
    for (const txid of results) {
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
    }

    /**
     * Assert that refund happened
     * confirms at 11 as it `increaseSpvHeight` increased height by 10,
     * and refund action adds 1.
     */
    const outputList: ListHtlcsOutputsResult[] = await container.call('spv_listhtlcoutputs')
    expect(outputList.length).toStrictEqual(2)
    const output1 = outputList.find(({ txid }: { txid: string }) => txid === fund1.txid)
    const output2 = outputList.find(({ txid }: { txid: string }) => txid === fund2.txid)
    expect(output1).toStrictEqual({
      txid: fund1.txid,
      vout: expect.any(Number),
      amount: new BigNumber(0.1).toNumber(),
      address: htlc1.address,
      confirms: 11,
      spent: {
        txid: results[0],
        confirms: 1
      }
    })
    expect(output2).toStrictEqual({
      txid: fund2.txid,
      vout: expect.any(Number),
      amount: new BigNumber(0.2).toNumber(),
      address: htlc2.address,
      confirms: 11
    })

    /**
     * Assert that the destination address received the refund
     */
    const listReceivingAddresses: ReceivedByAddressInfo[] = await container.call('spv_listreceivedbyaddress')
    const receivingAddress = listReceivingAddresses.find(l => l.address === destinationAddress)
    expect(receivingAddress?.address).toStrictEqual(destinationAddress)
    expect(receivingAddress?.txids.some((txid: string) => txid === results[0])).toStrictEqual(true)
  })

  it('should refundHtlcAll with custom feeRate', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    const fund = await container.call('spv_sendtoaddress', [htlc.address, 0.1]) // Funds HTLC address
    await container.spv.increaseSpvHeight()

    const destinationAddress = await container.call('spv_getnewaddress')
    const results = await testing.rpc.spv.refundHtlcAll(destinationAddress, { feeRate: new BigNumber('20000') }) // This refund should only happen after timeout threshold set in createHtlc. See https://en.bitcoin.it/wiki/BIP_0199
    expect(results.length).toStrictEqual(1)
    for (const txid of results) {
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
    }

    /**
     * Assert that refund happened
     * confirms at 11 as it `increaseSpvHeight` increased height by 10,
     * and refund action adds 1.
     */
    const outputList: ListHtlcsOutputsResult[] = await container.call('spv_listhtlcoutputs')
    expect(outputList.length).toStrictEqual(1)
    const output = outputList.find(({ txid }: { txid: string }) => txid === fund.txid)
    expect(output).toStrictEqual({
      txid: fund.txid,
      vout: expect.any(Number),
      amount: new BigNumber(0.1).toNumber(),
      address: htlc.address,
      confirms: 11,
      spent: {
        txid: results[0],
        confirms: 1
      }
    })

    /**
     * Assert that the destination address received the refund
     */
    const listReceivingAddresses: ReceivedByAddressInfo[] = await container.call('spv_listreceivedbyaddress')
    const receivingAddress = listReceivingAddresses.find(l => l.address === destinationAddress)
    expect(receivingAddress?.address).toStrictEqual(destinationAddress)
    expect(receivingAddress?.txids.some((txid: string) => txid === results[0])).toStrictEqual(true)
  })

  it('should not refundHtlcAll when no unspent HTLC outputs found', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    const promise = testing.rpc.spv.refundHtlcAll(await container.call('spv_getnewaddress'))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('No unspent HTLC outputs found')
  })

  it('should not refundHtlcAll with invalid destination address', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    await container.call('spv_sendtoaddress', [htlc.address, 0.1]) // Funds HTLC address
    await container.spv.increaseSpvHeight(10)

    const promise = testing.rpc.spv.refundHtlcAll('XXXX')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid destination address')
  })

  it('should not refundHtlcAll with not enough funds to cover fee', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const htlc = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, '10'])

    await testing.container.call('spv_sendtoaddress', [htlc.address, 0.00000546]) // Funds HTLC address with dust

    const promise = testing.rpc.spv.refundHtlcAll(await container.call('spv_getnewaddress'))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('No unspent HTLC outputs found')
  })

  it('should not refundHtlcAll when no htlc is created for wallet', async () => {
    const promise = testing.rpc.spv.refundHtlcAll(await container.call('spv_getnewaddress'))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Redeem script details not found.')
  })
})
