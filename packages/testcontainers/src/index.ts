import { RegTestGenesisKeys, MasterNodeKey as MNK } from '@defichain/jellyfish-network'

export { DockerOptions } from 'dockerode'

/**
 * Moved to @defichain/jellyfish-network
 * @deprecated use `import { RegTestGenesisKeys } from '@defichain/jellyfish-network'`
 */
export const GenesisKeys = RegTestGenesisKeys
/**
 * Moved to @defichain/jellyfish-network
 * @deprecated use `import { MasterNodeKey } from '@defichain/jellyfish-network'`
 */
export type MasterNodeKey = MNK

export * from './chains/defid_container'
export * from './chains/main_net_container'
export * from './chains/test_net_container'
export * from './chains/reg_test_container/index'
export * from './chains/reg_test_container/masternode'
export * from './chains/reg_test_container/persistent'
export * from './chains/reg_test_container/container_group'
