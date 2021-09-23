module.exports = {
  docs: [
    'core/introduction',
    'core/design',
    'core/usage',
  ],
  'jellyfish-api-core': [
    {
      type: 'category',
      label: 'RPC APIs',
      collapsed: false,
      items: [
        'jellyfish-api-core/blockchain',
        'jellyfish-api-core/mining',
        'jellyfish-api-core/net',
        'jellyfish-api-core/rawtx',
        'jellyfish-api-core/wallet',
        'jellyfish-api-core/poolpair',
        'jellyfish-api-core/token',
        'jellyfish-api-core/account',
        'jellyfish-api-core/oracle',
        'jellyfish-api-core/server',
        'jellyfish-api-core/masternode',
        'jellyfish-api-core/governance',
        'jellyfish-api-core/spv',
        'jellyfish-api-core/loan'
      ]
    }
  ],
  'testing': [
    {
      type: 'category',
      label: 'Testcontainers',
      collapsed: false,
      items: [
        'testcontainers/overview',
        'testcontainers/usage',
        'testcontainers/jellyfish'
      ]
    }
  ]
}
