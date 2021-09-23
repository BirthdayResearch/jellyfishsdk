import React, { PropsWithChildren } from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import styles from './styles.module.css'

export default function Home (): JSX.Element {
  const siteConfig = useDocusaurusContext().siteConfig

  return (
    <Layout description={siteConfig.tagline}>
      <header className={clsx('hero', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>

          <div className={styles.buttons}>
            <Link
              className={clsx('button button--primary button--lg', styles.getStarted)}
              to={useBaseUrl('docs/')}
            >
              Start Building →
            </Link>
          </div>
        </div>
      </header>

      <main className="container">
        <section className={clsx('row', styles.features)}>
          <Feature title="TypeScript">
            Written in TypeScript, jellyfish provides first-class citizen support for TypeScript.
          </Feature>
          <Feature title="Modern">
            Built using modern JavaScript approaches - ES6, Strict & Mono-repo. Transpiled and bundled backwards for
            compatibility.
          </Feature>
          <Feature title="Easy to Test">
            <code>@defichain/testcontainers</code> provides a lightweight, throwaway instances of regtest provisioned
            automatically in a Docker container.
          </Feature>
        </section>
      </main>
    </Layout>
  )
}

function Feature (props: PropsWithChildren<{ title: string }>): JSX.Element {
  return (
    <div className={clsx('col col--4')}>
      <h3>{props.title}</h3>
      <p>{props.children}</p>
    </div>
  )
}
