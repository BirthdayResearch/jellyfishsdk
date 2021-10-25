import { MasterNodeKey as MNK, RegTestFoundationKeys } from '@defichain/jellyfish-network'

export { DockerOptions } from 'dockerode'

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

export * from './containers/DeFiDContainer'
export * from './containers/MainNetContainer'
export * from './containers/TestNetContainer'
export * from './containers/RegTestContainer/index'
export * from './containers/RegTestContainer/Masternode'
export * from './containers/RegTestContainer/Persistent'
export * from './containers/RegTestContainer/ContainerGroup'

export * from './containers/LoanContainer'
