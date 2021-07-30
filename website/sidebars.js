module.exports = {
  docs: [
    'introduction',
    'jellyfish/design',
    'jellyfish/usage',
    {
      type: 'category',
      label: 'DeFi APIs',
      collapsed: false,
      items: [
        'jellyfish/api/blockchain',
        'jellyfish/api/mining',
        'jellyfish/api/net',
        'jellyfish/api/rawtx',
        'jellyfish/api/wallet',
        'jellyfish/api/poolpair',
        'jellyfish/api/token',
        'jellyfish/api/account',
        'jellyfish/api/oracle',
        'jellyfish/api/server',
        'jellyfish/api/masternode',
        'jellyfish/api/governance',
        'jellyfish/api/loan'
      ]
    }
  ],
  testcontainers: [
    'testcontainers/overview',
    'testcontainers/usage',
    'testcontainers/jellyfish'
  ]
}
