/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'DeFiChain Jellyfish SDK',
  tagline: 'A collection of TypeScript + JavaScript tools and libraries to build Native DeFi products.',
  url: 'https://jellyfish.defichain.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'DeFiChain',
  projectName: 'Jellyfish',
  themeConfig: {
    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/dracula')
    },
    colorMode: {
      defaultMode: 'light',
      switchConfig: {
        darkIcon: '🌙',
        lightIcon: '💡'
      },
      respectPrefersColorScheme: true
    },
    navbar: {
      title: 'Jellyfish',
      logo: {
        alt: 'DeFiChain Logo',
        src: 'img/defichain.svg'
      },
      items: [
        {
          to: 'docs',
          activeBasePath: 'docs/jellyfish',
          label: 'Full Node APIs',
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
        },
        {
          title: 'Legal',
          items: [
            {
              label: 'Privacy',
              to: 'https://defichain.com/privacy-policy/'
            },
            {
              label: 'MIT License',
              to: 'https://github.com/DeFiCh/jellyfish/blob/main/LICENSE'
            }
          ]
        },
        {
          items: [
            {
              html: `
                <a href="https://www.netlify.com" target="_blank" rel="noreferrer noopener" aria-label="Deploys by Netlify">
                  <img src="https://www.netlify.com/img/global/badges/netlify-color-accent.svg" alt="Deploys by Netlify" />
                </a>
              `
            }
          ]
        }
      ],
      logo: {
        alt: 'DeFi Blockchain',
        src: 'img/defi-blockchain.png',
        href: 'https://defichain.com'
      },
      copyright: `Copyright © ${new Date().getFullYear()} DeFiChain Foundation & DeFi Jellyfish Contributors`
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
