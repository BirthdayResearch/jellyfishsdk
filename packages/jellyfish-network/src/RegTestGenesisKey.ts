export interface KeyPair {
  address: string
  privKey: string
}

export interface MasterNodeKey {
  owner: KeyPair
  operator: KeyPair
}

/**
 * As per:
 * https://github.com/DeFiCh/ain/blob/6dc990c45788d6806ea/src/chainparams.cpp#L664-L677
 * https://github.com/DeFiCh/ain/blob/6dc990c45788d6806ea/test/functional/test_framework/test_node.py#L121-L132
 *
 * 2 first and 2 last of genesis MNs acts as foundation members
 */
export const RegTestGenesisKeys: MasterNodeKey[] = [
  {
    owner: {
      address: 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU',
      privKey: 'cRiRQ9cHmy5evDqNDdEV8f6zfbK6epi9Fpz4CRZsmLEmkwy54dWz'
    },
    operator: {
      address: 'mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy',
      privKey: 'cPGEaz8AGiM71NGMRybbCqFNRcuUhg3uGvyY4TFE1BZC26EW2PkC'
    }
  },
  {
    owner: {
      address: 'msER9bmJjyEemRpQoS8YYVL21VyZZrSgQ7',
      privKey: 'cSCmN1tjcR2yR1eaQo9WmjTMR85SjEoNPqMPWGAApQiTLJH8JF7W'
    },
    operator: {
      address: 'mps7BdmwEF2vQ9DREDyNPibqsuSRZ8LuwQ',
      privKey: 'cVNTRYV43guugJoDgaiPZESvNtnfnUW19YEjhybihwDbLKjyrZNV'
    }
  },
  {
    owner: {
      address: 'myF3aHuxtEuqqTw44EurtVs6mjyc1QnGUS',
      privKey: 'cSXiqwTiYzECugcvCT4PyPKz2yKaTST8HowFVBBjccZCPkX6wsE9'
    },
    operator: {
      address: 'mtbWisYQmw9wcaecvmExeuixG7rYGqKEU4',
      privKey: 'cPh5YaousYQ92tNd9FkiiS26THjSVBDHUMHZzUiBFbtGNS4Uw9AD'
    }
  },
  {
    owner: {
      address: 'mwyaBGGE7ka58F7aavH5hjMVdJENP9ZEVz',
      privKey: 'cVA52y8ABsUYNuXVJ17d44N1wuSmeyPtke9urw4LchTyKsaGDMbY'
    },
    operator: {
      address: 'n1n6Z5Zdoku4oUnrXeQ2feLz3t7jmVLG9t',
      privKey: 'cV9tJBgAnSfFmPaC6fWWvA9StLKkU3DKV7eXJHjWMUENQ8cKJDkL'
    }
  },
  {
    owner: {
      address: 'mgsE1SqrcfUhvuYuRjqy6rQCKmcCVKNhMu',
      privKey: 'cRJyBuQPuUhYzN5F2Uf35958oK9AzZ5UscRfVmaRr8ktWq6Ac23u'
    },
    operator: {
      address: 'mzqdipBJcKX9rXXxcxw2kTHC3Xjzd3siKg',
      privKey: 'cQYJ87qk39i3uFsXBZ2EkwdX1h72q1RQcX9V8X7PPydFPgujxrCy'
    }
  },
  {
    owner: {
      address: 'mud4VMfbBqXNpbt8ur33KHKx8pk3npSq8c',
      privKey: 'cPjeCNka7omVbKKfywPVQyBig9eopBHy6eJqLzrdJqMP4DXApkcb'
    },
    operator: {
      address: 'mk5DkY4qcV6CUpuxDVyD3AHzRq5XK9kbRN',
      privKey: 'cV6Hjhutf11RvFHaERkp52QNynm2ifNmtUfP8EwRRMg6NaaQsHTe'
    }
  },
  {
    owner: {
      address: 'bcrt1qyrfrpadwgw7p5eh3e9h3jmu4kwlz4prx73cqny',
      privKey: 'cR4qgUdPhANDVF3bprcp5N9PNW2zyogDx6DGu2wHh2qtJB1L1vQj'
    },
    operator: {
      address: 'bcrt1qmfvw3dp3u6fdvqkdc0y3lr0e596le9cf22vtsv',
      privKey: 'cVsa2wQvCjZZ54jGteQ8qiQbQLJQmZSBWriYUYyXbcaqUJFqK5HR'
    }
  },
  {
    owner: {
      address: 'bcrt1qyeuu9rvq8a67j86pzvh5897afdmdjpyankp4mu',
      privKey: 'cUX8AEUZYsZxNUh5fTS7ZGnF6SPQuTeTDTABGrp5dbPftCga2zcp'
    },
    operator: {
      address: 'bcrt1qurwyhta75n2g75u2u5nds9p6w9v62y8wr40d2r',
      privKey: 'cUp5EVEjuAGpemSuejP36TWWuFKzuCbUJ4QAKJTiSSB2vXzDLsJW'
    }
  }
]
