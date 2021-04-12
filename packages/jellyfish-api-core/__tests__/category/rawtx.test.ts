import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { BigNumber } from '../../src'

const container = new MasterNodeRegTestContainer()
const client = new ContainerAdapterClient(container)

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  // Wait for > balance for testing transaction
  await waitForExpect(async () => {
    const balance: BigNumber = await client.wallet.getBalance()
    expect(balance.isGreaterThan(new BigNumber('300'))).toBe(true)
  })
})

afterAll(async () => {
  await container.stop()
})

describe('createRawTransaction', () => {
  const bech32 = 'bcrt1qvy72dqwy66xa5kkas86zuruanzqslq80le4drc'
  const privKey = 'cR5AWXgDrZXkXbB74cHXY5dpGwg6pPAHwSJgXtgFRodasjduoNiJ'
  const funded = new BigNumber('10')

  beforeEach(async () => {
    const txid = await container.call('sendtoaddress', [bech32, funded])

    // TODO(fuxingloh): send to address
    // TODO(fuxingloh): setup unspent into a new wallet for testing
  })

  it('should createRawTransaction()', () => {

  });
})

describe('signRawTransactionWithKey', () => {
  const bech32 = 'bcrt1qf26rj8895uewxcfeuukhng5wqxmmpqp555z5a7'
  const privKey = 'cQbfHFbdJNhg3UGaBczir2m5D4hiFRVRKgoU8GJoxmu2gEhzqHtV'
})

describe('testMempoolAccept', () => {
  const bech32 = 'bcrt1q0860seu9wkczcrrc80apms6eecfyy0lycfgqcm'
  const privKey = 'cPYesPZwbm89k3cJrRRVU3apCnLPxGHzzeLAr9M2BNHQE4pcEjNm'
})

describe('sendRawTransaction', () => {
  const bech32 = 'bcrt1qnadpmd2596kw4r7n02pz927jfnaq7y3qcvkcv2'
  const privKey = 'cUhK4NkExCaBV4MxhR7vqLkRk5ekUFdn2h9Y3qUNBSCBQu11q1SH'
})

describe('lifecycle stateful unspent, queried', () => {
  const bech32 = 'bcrt1qykj5fsrne09yazx4n72ue4fwtpx8u65zac9zhn'
  const privKey = 'cQSsfYvYkK5tx3u1ByK2ywTTc9xJrREc1dd67ZrJqJUEMwgktPWN'
})

describe('lifecycle stateless unspent, self tracked', () => {
  const bech32 = 'bcrt1qg6qmejx224dqwl7zl5gwr8mn57fwx5lppmqen6'
  const privKey = 'cVEEgcoxP7cPB23ZM1Y2k33z66rABjbtFZ6AVRKai1XiamZ3Fe5z'
})


