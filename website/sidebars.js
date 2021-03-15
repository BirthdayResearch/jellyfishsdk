module.exports = {
  sidebar: [
    'getting-started',
    {
      type: 'category',
      label: 'Jellyfish',
      collapsed: false,
      items: ['jellyfish/overview']
    },
    {
      type: 'category',
      label: 'Testcontainers',
      collapsed: false,
      items: [
        'testcontainers/overview',
        'testcontainers/installation',
        'testcontainers/usage'
      ]
    }
  ]
}
