import React from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import styles from './styles.module.css'

const features = [
  {
    title: 'TypeScript',
    description: (
      <>
        Written in TypeScript, jellyfish provides first-class citizen support for TypeScript.
      </>
    )
  },
  {
    title: 'Modern',
    description: (
      <>
        Built using modern JavaScript approaches - ES6, Strict & Mono-repo. Transpiled and bundled backwards for compatibility.
      </>
    )
  },
  {
    title: 'Protocol-agnostic',
    description: (
      <>
        Independent of communication protocols, allowing vendor-agnostic middleware adaptable to your needs.
      </>
    )
  },
  {
    title: 'Easy to Use',
    description: (
      <>
        <code>@defichain/jellyfish</code> was designed from the ground up to be easily integrated with any
        JavaScript environment.
      </>
    )
  },
  {
    title: 'Easy to Test',
    description: (
      <>
        <code>@defichain/testcontainers</code> provides a lightweight, throwaway instances of regtest provisioned
        automatically in a Docker container.
      </>
    )
  }
]

function Feature ({ title, description }) {
  return (
    <div className={clsx('col col--4')}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

export default function Home () {
  const context = useDocusaurusContext()
  const { siteConfig = {} } = context
  return (
    <Layout
      title='Build dApps on DeFiChain'
      description={siteConfig.tagline}
    >

      <header className={clsx('hero', styles.heroBanner)}>
        <div className='container'>
          <h1 className='hero__title'>
            {siteConfig.title}
          </h1>
          <p className='hero__subtitle'>
            {siteConfig.tagline}
          </p>

          <div className={styles.buttons}>
            <Link
              className={clsx(
                'button button--primary button--lg',
                styles.getStarted
              )}
              to={useBaseUrl('docs/')}
            >
              Start Building →
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section>
          <div className='container'>
            <div className={clsx('row', styles.features)}>
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}
