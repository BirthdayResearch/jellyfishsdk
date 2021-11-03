import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LoanVaultState } from '../../src/api/loan'

let container: LoanMasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient
let testing: Testing

beforeAll(async () => {
  container = new LoanMasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  testing = Testing.create(container)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 100,
    interestRate: new BigNumber(2.5),
    id: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: await testing.address('vault'),
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: await testing.address('vault'),
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: await testing.address('vault'),
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: await testing.address('vault'),
    loanSchemeId: 'default'
  })
  await testing.generate(1)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('list', () => {
  it('should listVault with size only', async () => {
    const address = await testing.address('vault')

    const result = await client.address.listVault(address)
    expect(result.length).toStrictEqual(4)

    result.forEach(e =>
      expect(e).toStrictEqual({
        vaultId: expect.any(String),
        loanSchemeId: 'default',
        ownerAddress: address,
        state: LoanVaultState.ACTIVE,
        informativeRatio: '-1',
        collateralRatio: '-1',
        collateralValue: '0',
        loanValue: '0',
        interestValue: '0',
        collateralAmounts: [],
        loanAmounts: [],
        interestAmounts: []
      })
    )
  })

  it('should listVault with size and pagination', async () => {
    const address = await testing.address('vault')

    const vaultIds = (await client.address.listVault(address, 20))
      .map(value => value.vaultId)

    const first = await client.address.listVault(address, 2)
    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual(vaultIds[1])

    expect(first[0].vaultId).toStrictEqual(vaultIds[0])
    expect(first[1].vaultId).toStrictEqual(vaultIds[1])

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual(vaultIds[3])

    expect(next[0].vaultId).toStrictEqual(vaultIds[2])
    expect(next[1].vaultId).toStrictEqual(vaultIds[3])

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})
