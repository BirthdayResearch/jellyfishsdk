import { RegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'

describe('derive addresses', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should derive an address without range', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/0)#t6wfjs64'
    const address = ['bcrt1qjqmxmkpmxt80xz4y3746zgt0q3u3ferr34acd5']
    expect(await client.misc.deriveAddresses(descriptor)).toStrictEqual(address)
  })

  it('should derive an address with range', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)#kft60nuy'
    const address = ['bcrt1qhku5rq7jz8ulufe2y6fkcpnlvpsta7rq4442dy', 'bcrt1qpgptk2gvshyl0s9lqshsmx932l9ccsv265tvaq']
    expect(await client.misc.deriveAddresses(descriptor, [1, 2])).toStrictEqual(address)
  })

  it('should raise an error if the range is specified for un-ranged descriptor', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/0)#t6wfjs64'
    const promise = client.misc.deriveAddresses(descriptor, [1, 3])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'Range should not be specified for an un-ranged descriptor',
        method: 'deriveaddresses'
      }
    })
  })

  it('should raise an error if there is no range for a range descriptor', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)#kft60nuy'
    const promise = client.misc.deriveAddresses(descriptor)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'Range must be specified for a ranged descriptor',
        method: 'deriveaddresses'
      }
    })
  })

  it('should raise an error if end of range is too high', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)'
    const promise = client.misc.deriveAddresses(descriptor, [100000])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'Range must be specified as end or as [begin,end]',
        method: 'deriveaddresses'
      }
    })
  })

  it('should raise an error if range is too large', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)'
    const promise = client.misc.deriveAddresses(descriptor, [1, 1000000000])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'Range is too large',
        method: 'deriveaddresses'
      }
    })
  })

  it('should raise an error if range is less than 0', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)'
    const promise = client.misc.deriveAddresses(descriptor, [-1, 2])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'Range should be greater or equal than 0',
        method: 'deriveaddresses'
      }
    })
  })

  it('should raise an error if end of range is smaller than the start', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)'
    const promise = client.misc.deriveAddresses(descriptor, [2, 0])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'Range specified as [begin,end] must not have begin after end',
        method: 'deriveaddresses'
      }
    })
  })

  it('should raise an error if there is wrong drescriptor', async () => {
    const descriptor = 'descriptor'
    const promise = client.misc.deriveAddresses(descriptor, [0, 2])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Missing checksum',
        method: 'deriveaddresses'
      }
    })
  })
})
