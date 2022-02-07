import { Testing } from '@defichain/jellyfish-testing'
import { MainNetContainer, RegTestContainer, StartFlags, TestNetContainer } from '@defichain/testcontainers'
import { TestingWrapper } from '../src/testingwrapper'

const testingWrapper = new TestingWrapper()
describe('create a single test container using testwrapper', () => {
  let testing: Testing

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should be able to create and call single regtest masternoderegtest container', async () => {
    testing = testingWrapper.create()
    await testing.container.start()

    // call rpc
    let blockHeight = await testing.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(0)
    await testing.generate(1)
    blockHeight = await testing.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(1)
  })

  it('should be able to create regtest non masternode container', async () => {
    testing = testingWrapper.create(1, index => new RegTestContainer()) as Testing
    await testing.container.start()

    // call rpc
    const blockHeight = await testing.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(0)

    const addr = await testing.generateAddress()
    const promise = testing.container.call('generatetoaddress', [1, addr, 1])

    await expect(promise).rejects.toThrow('Error: I am not masternode operator')
  })

  it('should be able to create mainnet container', async () => {
    testing = testingWrapper.create(1, index => new MainNetContainer()) as Testing
    await testing.container.start()
    // call rpc
    const { chain } = await testing.container.getMiningInfo()
    expect(chain).toStrictEqual('main')
  })

  it('should be able to create testnet container', async () => {
    testing = testingWrapper.create(1, index => new TestNetContainer()) as Testing
    await testing.container.start()
    // call rpc
    const { chain } = await testing.container.getMiningInfo()
    expect(chain).toStrictEqual('test')
  })

  it('should be able to override start option', async () => {
    testing = testingWrapper.create()
    const startFlags: StartFlags[] = [{ name: 'fortcanninghillheight', value: 11 }]
    await testing.container.start({ startFlags })

    const { softforks } = await testing.rpc.blockchain.getBlockchainInfo()
    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(softforks['fortcanninghill'].height).toStrictEqual(11)
  })
})

describe('create multiple test container using testwrapper', () => {
  it('should create a masternode group and test sync block and able to add and sync non masternode container', async () => {
    const tGroup = testingWrapper.create(2)
    await tGroup.start()

    const alice = tGroup.get(0)
    let blockHeight = await alice.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(0)

    const bob = tGroup.get(1)
    blockHeight = await bob.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(0)

    await alice.generate(10)
    await tGroup.waitForSync()

    blockHeight = await alice.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(10)
    blockHeight = await bob.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(10)

    let blockHashAlice = await alice.rpc.blockchain.getBestBlockHash()
    let blockHashBob = await alice.rpc.blockchain.getBestBlockHash()
    expect(blockHashAlice).toStrictEqual(blockHashBob)

    await bob.generate(10)
    await tGroup.waitForSync()

    blockHeight = await alice.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(20)
    blockHeight = await bob.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(20)

    blockHashAlice = await alice.rpc.blockchain.getBestBlockHash()
    blockHashBob = await alice.rpc.blockchain.getBestBlockHash()
    expect(blockHashAlice).toStrictEqual(blockHashBob)

    // create a non masternode RegTestTesting
    const nonMasternodeTesting = testingWrapper.create(1, index => new RegTestContainer()) as Testing
    await nonMasternodeTesting.container.start()

    // add to group
    await tGroup.addTesting(nonMasternodeTesting)
    await tGroup.waitForSync()
    blockHeight = await nonMasternodeTesting.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(20)
    const blockHashNonMasternode = await nonMasternodeTesting.rpc.blockchain.getBestBlockHash()
    expect(blockHashNonMasternode).toStrictEqual(blockHashAlice)

    await tGroup.stop()
  })

  it('should be able to create individual container of masternode and regtest and create a group from it', async () => {
    const masternodeTesting = testingWrapper.create()
    await masternodeTesting.container.start()
    const nonmasternodeTesting = testingWrapper.create(1, (index) => new RegTestContainer()) as Testing
    await nonmasternodeTesting.container.start()

    const tGroup = testingWrapper.group()
    await tGroup.start()

    await tGroup.addTesting(masternodeTesting)
    await tGroup.addTesting(nonmasternodeTesting)

    await masternodeTesting.container.generate(1)
    await tGroup.waitForSync()

    const masternodeBestHash = await masternodeTesting.rpc.blockchain.getBestBlockHash()
    const nonMasternodeBestHash = await nonmasternodeTesting.rpc.blockchain.getBestBlockHash()
    expect(masternodeBestHash).toStrictEqual(nonMasternodeBestHash)

    await tGroup.stop()
  })
})
