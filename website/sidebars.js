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
        'jellyfish/api/rawtx',
        'jellyfish/api/wallet',
        'jellyfish/api/poolpair'
      ]
    }
  ],
  testcontainers: [
    'testcontainers/overview',
    'testcontainers/usage',
    'testcontainers/jellyfish'
  ]
}
