import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

describe('Masternode', () => {
  const tGroup = TestingGroup.create(1)

  beforeAll(async () => {
    await tGroup.start()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should be empty when block is not 15', async () => {
    for (let i = 0; i < 15; i++) {
      const blockNumber = await tGroup.get(0).rpc.blockchain.getBlockCount()
      expect(blockNumber).toBeLessThan(15)

      const anchorTeams = await tGroup.get(0).rpc.masternode.getAnchorTeams()
      expect(anchorTeams.auth).toHaveLength(0)
      expect(anchorTeams.confirm).toHaveLength(0)
    }
  })

  it('should getAnchorTeams', async () => {
    await tGroup.get(0).container.waitForBlockHeight(14) // wait for block height nore than 14
    const blockNumber = await tGroup.get(0).rpc.blockchain.getBlockCount()
    expect(blockNumber).toEqual(15)

    const anchorTeams = await tGroup.get(0).rpc.masternode.getAnchorTeams()
    expect(anchorTeams.auth).toStrictEqual([RegTestFoundationKeys[0].operator.address])
    expect(anchorTeams.confirm).toStrictEqual([RegTestFoundationKeys[0].operator.address])
  })

  it('should getAnchorTeams corectly when a new anchor team has been added', async () => {
    // add another Test container
    const newTestContainer = new MasterNodeRegTestContainer(RegTestFoundationKeys[1])
    await newTestContainer.start()

    await tGroup.add(newTestContainer)
    await tGroup.waitForSync()
    const tG0BestBlockhash = await tGroup.get(0).rpc.blockchain.getBestBlockHash()
    const tG1BestBlockhash = await tGroup.get(1).rpc.blockchain.getBestBlockHash()
    expect(tG0BestBlockhash).toEqual(tG1BestBlockhash)

    await tGroup.get(1).generate(15)
    await tGroup.waitForSync()
    const anchorTeams = await tGroup.get(1).rpc.masternode.getAnchorTeams()
    expect(anchorTeams.auth).toHaveLength(2)
    expect(anchorTeams.confirm).toHaveLength(2)
    expect(anchorTeams.auth).toEqual(
      expect.arrayContaining(
        [RegTestFoundationKeys[0].operator.address,
          RegTestFoundationKeys[1].operator.address]
      )
    )
    expect(anchorTeams.confirm).toEqual(
      expect.arrayContaining(
        [RegTestFoundationKeys[0].operator.address,
          RegTestFoundationKeys[1].operator.address]
      )
    )
  })

  it('should getAnchorTeams correctly when blockheight is passed in', async () => {
    const anchorTeamsBeforeFirst = await tGroup.get(0).rpc.masternode.getAnchorTeams(14)
    expect(anchorTeamsBeforeFirst.auth).toHaveLength(0)
    expect(anchorTeamsBeforeFirst.confirm).toHaveLength(0)

    const anchorTeamsBeforeSecond = await tGroup.get(0).rpc.masternode.getAnchorTeams(29)
    expect(anchorTeamsBeforeSecond.auth).toStrictEqual([RegTestFoundationKeys[0].operator.address])
    expect(anchorTeamsBeforeSecond.confirm).toStrictEqual([RegTestFoundationKeys[0].operator.address])
  })
})
