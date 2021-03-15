module.exports = {
  sidebar: [
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
      label: 'Jellyfish APIs',
      collapsed: false,
      items: [
        'jellyfish/api/mining',
        'jellyfish/api/wallet'
      ]
    },
    {
      type: 'category',
      label: 'Testcontainers',
      collapsed: false,
      items: [
        'testcontainers/overview',
        'testcontainers/usage'
      ]
    }
  ]
}
