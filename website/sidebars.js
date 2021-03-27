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
        'jellyfish/api/mining',
        'jellyfish/api/wallet'
      ]
    }
  ],
  testcontainers: [
    'testcontainers/overview',
    'testcontainers/usage',
    'testcontainers/jellyfish'
  ]
}
