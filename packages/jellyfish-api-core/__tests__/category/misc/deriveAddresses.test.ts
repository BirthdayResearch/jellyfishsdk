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
    await expect(client.misc.deriveAddresses(descriptor, [1, 3])).rejects.toThrow(RpcApiError)
  })

  it('should raise an error if there is no range for a range descriptor', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)'
    await expect(client.misc.deriveAddresses(descriptor, [1, 3])).rejects.toThrow(RpcApiError)
  })

  it('should raise an error if end of range is too high', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)'
    await expect(client.misc.deriveAddresses(descriptor, [100000])).rejects.toThrow(RpcApiError)
  })

  it('should raise an error if range is too large', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)'
    await expect(client.misc.deriveAddresses(descriptor, [1, 100000])).rejects.toThrow(RpcApiError)
  })

  it('should raise an error if range is less than 0', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)'
    await expect(client.misc.deriveAddresses(descriptor, [-1, 2])).rejects.toThrow(RpcApiError)
  })

  it('should raise an error if end of range is inferior to beginning', async () => {
    const descriptor = 'wpkh(tprv8ZgxMBicQKsPd7Uf69XL1XwhmjHopUGep8GuEiJDZmbQz6o58LninorQAfcKZWARbtRtfnLcJ5MQ2AtHcQJCCRUcMRvmDUjyEmNUWwx8UbK/1/1/*)'
    await expect(client.misc.deriveAddresses(descriptor, [2, 0])).rejects.toThrow(RpcApiError)
  })
})
