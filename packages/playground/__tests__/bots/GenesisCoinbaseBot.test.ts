import { PlaygroundTesting } from '../../testing/PlaygroundTesting'

const playgroundTesting = PlaygroundTesting.create()

beforeAll(async () => {
  await playgroundTesting.start()
  await playgroundTesting.container.waitForWalletCoinbaseMaturity()
  await playgroundTesting.bootstrap()
})

afterAll(async () => {
  await playgroundTesting.stop()
})

it('', async () => {
  // const schemes = await playgroundTesting.rpc.loan.listLoanSchemes()
  // console.log('schemes: ', schemes)

  // const oracles = await playgroundTesting.rpc.oracle.listOracles()
  // console.log('oracles: ', oracles)

  const tokens = await playgroundTesting.rpc.token.listTokens()
  // console.log('tokens: ', tokens)
  console.log('tokens: ', Object.keys(tokens).length)

  // const dex = await playgroundTesting.rpc.poolpair.listPoolPairs()
  // console.log('dex: ', dex)

  // const mns = await playgroundTesting.rpc.masternode.listMasternodes()
  // console.log('mns: ', mns)
})
