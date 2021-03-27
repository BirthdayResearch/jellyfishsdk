module.exports = {
  docs: [
    'introduction',
    {
      type: 'category',
      label: 'Jellyfish',
      collapsed: false,
      items: [
        'jellyfish/overview',
        'jellyfish/design',
        'jellyfish/usage'
      ]
    },
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
