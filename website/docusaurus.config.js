/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'DeFiChain Jellyfish',
  tagline: 'A collection of TypeScript + JavaScript tools and libraries for DeFiChain developers to build decentralized finance on Bitcoin',
  url: 'https://jellyfish.defichain.io',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'DeFiChain',
  projectName: 'Jellyfish',
  themeConfig: {
    navbar: {
      title: 'DeFiChain Jellyfish',
      logo: {
        alt: 'DeFiChain Logo',
        src: 'img/defichain.svg'
      },
      items: [
        {
          to: 'docs/jellyfish',
          activeBasePath: 'docs/jellyfish',
          label: 'Jellyfish',
          position: 'left'
        },
        {
          to: 'docs/testcontainers',
          activeBasePath: 'docs/testcontainers',
          label: 'Testcontainers',
          position: 'left'
        },
        {
          href: 'https://github.com/DeFiCh/jellyfish',
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'DeFiChain',
          items: [
            {
              label: '$DFI',
              to: 'https://defichain.com/dfi/'
            },
            {
              label: 'Foundation',
              to: 'https://defichain.com/foundation/'
            },
            {
              label: 'White paper',
              to: 'https://defichain.com/white-paper/'
            },
            {
              label: 'Developers',
              to: 'https://defichain.com/developers/'
            }
          ]
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Twitter',
              href: 'https://twitter.com/defichain'
            },
            {
              label: 'Reddit',
              to: 'https://reddit.com/r/defiblockchain'
            },
            {
              label: 'GitHub',
              href: 'https://github.com/DeFiCh'
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} DeFiChain Foundation & Jellyfish Contributors`
    }
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/DeFiCh/jellyfish/tree/main/website'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ]
}
