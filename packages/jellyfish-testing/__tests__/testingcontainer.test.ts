import { NonMNTesting, Testing } from '@defichain/jellyfish-testing'
import { RegTestContainer, StartFlags } from '@defichain/testcontainers'
import { TestingWrapper } from '../src/testingwrapper'

describe('create a single test container using testwrapper', () => {
  let testing: Testing | NonMNTesting

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should be able to create and call single regtest masternoderegtest container', async () => {
    testing = TestingWrapper.create()
    await testing.container.start()

    // call rpc
    let blockHeight = await testing.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(0)
    await testing.generate(1)
    blockHeight = await testing.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(1)
  })

  it('should be able to create regtest non masternode container', async () => {
    testing = TestingWrapper.createNonMN()
    await testing.container.start()

    // call rpc
    const blockHeight = await testing.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(0)

    const addr = await testing.generateAddress()
    const promise = testing.container.call('generatetoaddress', [1, addr, 1])

    await expect(promise).rejects.toThrow('Error: I am not masternode operator')
  })

  it('should be able to override start option', async () => {
    testing = TestingWrapper.create()
    const startFlags: StartFlags[] = [{ name: 'fortcanninghillheight', value: 11 }]
    await testing.container.start({ startFlags })

    const { softforks } = await testing.rpc.blockchain.getBlockchainInfo()
    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(softforks['fortcanninghill'].height).toStrictEqual(11)
  })

  it('should create 1 testing instance even if 0 is passed in as a param', async () => {
    testing = TestingWrapper.createNonMN(0, () => new RegTestContainer())
    await testing.container.start()

    // call rpc
    const blockHeight = await testing.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(0)
  })
})

describe('create multiple test container using testwrapper', () => {
  it('should create a masternode group and test sync block and able to add and sync non masternode container', async () => {
    const tGroup = TestingWrapper.create(2)
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
    const nonMasternodeTesting = TestingWrapper.createNonMN()
    await nonMasternodeTesting.container.start()

    // add to group
    await tGroup.addNonMNTesting(nonMasternodeTesting)
    await tGroup.waitForSync()
    blockHeight = await nonMasternodeTesting.rpc.blockchain.getBlockCount()
    expect(blockHeight).toStrictEqual(20)
    const blockHashNonMasternode = await nonMasternodeTesting.rpc.blockchain.getBestBlockHash()
    expect(blockHashNonMasternode).toStrictEqual(blockHashAlice)

    await tGroup.stop()
  })

  it('should be able to create individual container of masternode and regtest and create a group from it', async () => {
    const masternodeTesting = TestingWrapper.create()
    await masternodeTesting.container.start()
    const nonmasternodeTesting = TestingWrapper.createNonMN(1)
    await nonmasternodeTesting.container.start()

    const tGroup = TestingWrapper.group([masternodeTesting], [nonmasternodeTesting])
    await tGroup.start()

    await masternodeTesting.container.generate(1)
    await tGroup.waitForSync()

    const masternodeBestHash = await masternodeTesting.rpc.blockchain.getBestBlockHash()
    const nonMasternodeBestHash = await nonmasternodeTesting.rpc.blockchain.getBestBlockHash()
    expect(masternodeBestHash).toStrictEqual(nonMasternodeBestHash)

    await tGroup.stop()
  })
})
