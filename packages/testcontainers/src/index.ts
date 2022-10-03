import { MasterNodeKey as MNK, RegTestFoundationKeys } from '@defichain/jellyfish-network'

export { DockerOptions } from 'dockerode'
export { waitForCondition } from './utils'

/**
 * Moved to @defichain/jellyfish-network
 * @deprecated use `import { RegTestFoundationKeys } from '@defichain/jellyfish-network'`
 */
export const GenesisKeys = RegTestFoundationKeys
/**
 * Moved to @defichain/jellyfish-network
 * @deprecated use `import { MasterNodeKey } from '@defichain/jellyfish-network'`
 */
export type MasterNodeKey = MNK

export * from './containers/Dockerode/DeFiDContainer'
export * from './containers/Dockerode/MainNetContainer'
export * from './containers/Dockerode/TestNetContainer'
export * from './containers/Dockerode/RegTestContainer/index'
export * from './containers/Dockerode/RegTestContainer/Masternode'
export * from './containers/Dockerode/RegTestContainer/Persistent'
export * from './containers/Dockerode/RegTestContainer/ContainerGroup'
export * from './utils'

export * from './containers/Dockerode/RegTestContainer/LoanContainer'

export * from './containers/Dockerode/AppContainer/WhaleSanityContainer'
