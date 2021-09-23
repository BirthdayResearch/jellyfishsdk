/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'Jellyfish Ecosystem',
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
      title: 'Jellyfish Ecosystem',
      logo: {
        alt: 'DeFiChain Logo',
        src: 'img/defichain.svg'
      },
      items: [
        {
          to: 'docs',
          activeBasePath: 'docs/core',
          label: 'SDK',
          position: 'left'
        },
        {
          to: 'docs/ocean/stats',
          activeBasePath: 'docs/ocean',
          label: 'Ocean APIs',
          position: 'left'
        },
        {
          to: 'docs/jellyfish-api-core/blockchain',
          activeBasePath: 'docs/jellyfish-api-core',
          label: 'Full Node APIs',
          position: 'left'
        },
        {
          to: 'docs/testcontainers',
          activeBasePath: 'docs/testcontainers',
          label: 'Samples',
          position: 'left'
        },
        {
          to: 'docs/testcontainers',
          activeBasePath: 'docs/testcontainers',
          label: 'Testing',
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
      links: [
        {
          title: 'DeFiChain',
          items: [
            {
              label: 'Foundation',
              to: 'https://defichain.com/foundation/'
            },
            {
              label: 'White Paper',
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
              to: 'https://twitter.com/defichain'
            },
            {
              label: 'Reddit',
              to: 'https://reddit.com/r/defiblockchain'
            },
            {
              label: 'GitHub',
              to: 'https://github.com/DeFiCh'
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
                  <img src="https://www.netlify.com/img/global/badges/netlify-light.svg" alt="Deploys by Netlify" />      
                </a>
              `
            }
          ]
        }
      ],
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
