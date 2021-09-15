import { WhaleApiClient } from '@defichain/whale-api-client'
import { useState } from 'react'

const api = new WhaleApiClient({
  version: 'v0',
  network: 'mainnet',
  url: 'https://ocean.defichain.com'
})

export default function Index ({
  masternodes,
  nextToken
}) {
  const [list, setList] = useState(masternodes)
  const [token, setToken] = useState(nextToken)

  async function loadMore () {
    if (next === undefined) {
      return
    }
    const response = await api.masternodes.list(60, token)
    setToken(response.nextToken)
    setList([
      ...list,
      ...response
    ])
  }

  return (
    <>
      <h1>DeFiChain Masternode</h1>

      <p>
        This is a very simple example to fetch Masternode information from ocean.defichain.com with pagination.
      </p>

      <table className="table">
        <thead>
        <th>Owner</th>
        <th>Operator</th>
        <th>TimeLock Weeks</th>
        <th>Minted Blocks</th>
        <th>State</th>
        </thead>

        <tbody>
        {list.map(masternode => {
          return (
            <tr key={masternode.id}>
              <td>{masternode.owner.address}</td>
              <td>{masternode.operator.address}</td>
              <td>{masternode.timelock}</td>
              <td>{masternode.mintedBlocks}</td>
              <td>{masternode.state}</td>
            </tr>
          )
        })}
        </tbody>
      </table>

      <button onClick={loadMore}>Load More</button>
    </>
  )
}

export async function getStaticProps () {
  // Due to current limitations, we only allow 60 request per page
  const response = await api.masternodes.list(60)
  return {
    props: {
      masternodes: response,
      nextToken: response.nextToken
    }
  }
}
