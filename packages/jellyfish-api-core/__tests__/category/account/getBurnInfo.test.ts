import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

const container = new MasterNodeRegTestContainer()
const client = new ContainerAdapterClient(container)
const burnAddress = 'mfburnZSAM7Gs1hpDeNaMotJXSGA7edosG'

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  const utxos = await client.wallet.listUnspent()
  const inputs = utxos.map((utxo: { txid: string, vout: number }) => {
    return {
      txid: utxo.txid,
      vout: utxo.vout
    }
  })

  const loanMinterAddr = await container.getNewAddress()
  await client.account.utxosToAccount({ [loanMinterAddr]: '1000000@DFI' }, inputs)
  await container.generate(1)

  // Masternode
  await client.masternode.createMasternode(await container.getNewAddress('', 'legacy'))
  await container.generate(1)

  // create loan to loan gold token
  const priceFeeds = [{
    token: 'DFI',
    currency: 'USD'
  }, {
    token: 'GOLD',
    currency: 'USD'
  }]
  const oracleAddr = await container.getNewAddress()
  const oracleId = await client.oracle.appointOracle(oracleAddr, priceFeeds, { weightage: 1 })
  await container.generate(1)
  const timestamp = Math.floor(new Date().getTime() / 1000)
  await client.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '1@GOLD',
      currency: 'USD'
    },
    {
      tokenAmount: '1@DFI',
      currency: 'USD'
    }]
  })
  await container.generate(1)

  const loanTokenSchemeId = 'minter'
  await client.loan.createLoanScheme({
    minColRatio: 100,
    interestRate: new BigNumber(0.01),
    id: loanTokenSchemeId
  })

  await container.generate(1)

  const mintTokenVaultAddr = await container.getNewAddress()
  const loanVaultId = await client.loan.createVault({
    ownerAddress: mintTokenVaultAddr,
    loanSchemeId: loanTokenSchemeId
  })

  await container.generate(1)

  await client.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })

  await client.loan.setLoanToken({
    symbol: 'GOLD',
    fixedIntervalPriceId: 'GOLD/USD'
  })

  await container.generate(1)

  await client.loan.depositToVault({
    vaultId: loanVaultId,
    from: loanMinterAddr,
    amount: '1000000@DFI'
  })

  await container.generate(1)

  const fundedAddress = await container.getNewAddress()
  await client.loan.takeLoan({
    vaultId: loanVaultId,
    amounts: '100@GOLD',
    to: fundedAddress
  })
  // burn gold token
  await container.generate(1)
  await client.account.sendTokensToAddress({}, { [burnAddress]: ['50@GOLD'] })

  // send utxo to burn address
  await client.wallet.sendToAddress(burnAddress, 10)
  await container.generate(1)
})

afterAll(async () => {
  await container.stop()
})

it('should getBurnInfo', async () => {
  const info = await client.account.getBurnInfo()

  expect(info).toStrictEqual({
    address: burnAddress,
    amount: new BigNumber('10'),
    tokens: ['50.00000000@GOLD'],
    feeburn: new BigNumber('1.5'),
    emissionburn: new BigNumber('6644.44')
  })
})
