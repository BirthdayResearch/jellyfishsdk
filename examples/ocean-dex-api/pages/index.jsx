import { WhaleApiClient } from '@defichain/whale-api-client'

export default function Index ({ pairs }) {
  return (
    <>
      <h1>DEX Pool Pairs</h1>

      <p>
        This is a very simple example to fetch live DEX Pool Pair information from ocean.defichain.com.
      </p>

      <table className="table">
        <thead>
        <th>ID</th>
        <th>Pair Symbol</th>
        <th>Left Symbol</th>
        <th>Left Reserve</th>
        <th>Right Symbol</th>
        <th>Right Reserve</th>
        <th>APY</th>
        </thead>

        <tbody>
        {pairs.map(pair => {
          return (
            <tr>
              <td>{pair.id}</td>
              <td>{pair.symbol}</td>
              <td>{pair.tokenA.symbol}</td>
              <td>{pair.tokenA.reserve}</td>
              <td>{pair.tokenB.symbol}</td>
              <td>{pair.tokenB.reserve}</td>
              <td>{pair.apr.total * 100}%</td>
            </tr>
          )
        })}
        </tbody>
      </table>
    </>
  )
}

export async function getStaticProps () {
  const api = new WhaleApiClient({
    version: 'v0',
    network: 'mainnet',
    url: 'https://ocean.defichain.com'
  })

  return {
    props: {
      pairs: await api.poolpairs.list()
    }
  }
}
