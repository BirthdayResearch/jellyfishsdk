---
id: governance
title: Governance API
sidebar_label: Governance API
slug: /jellyfish/api/governance
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.governance.
const something = await client.governance.method()
```

## createCfp

Creates a Cummunity Fund Request.

```ts title="client.governance.createCfp()"
interface governance {
  createCfp (data: CFPData, utxos: UTXO[] = []): Promise<string>
}

interface CFPData {
  title: string
  amount: BigNumber
  payoutAddress: string
  cycles?: number
}

interface UTXO {
  txid: string
  vout: number
}
```

## getProposal

Returns information about the proposal.

```ts title="client.governance.getProposal()"
interface governance {
  getProposal (proposalId: string): Promise<ProposalInfo>
}

enum ProposalType {
  COMMUNITY_FUND_REQUEST = 'CommunityFundRequest',
  BLOCK_REWARD_RELLOCATION = 'BlockRewardRellocation',
  VOTE_OF_CONFIDENCE = 'VoteOfConfidence'
}

enum ProposalStatus {
  VOTING = 'Voting',
  REJECTED = 'Rejected',
  COMPLETED = 'Completed'
}

interface ProposalInfo {
  proposalId: string
  title: string
  type: ProposalType
  status: ProposalStatus
  amount: number
  cyclesPaid: number
  totalCycles: number
  finalizeAfter: number
  payoutAddress: string
}
 ```

## createVoc

Creates a Vote of Confidence.

```ts title="client.governance.createVoc()"
interface governance {
  createVoc (title: string, utxos: UTXO[]): Promise<string>
}

interface UTXO {
  txid: string
  vout: number
}
```

## listProposals

Returns list of proposals.

```ts title="client.governance.listProposals()"
interface governance {
  async listProposals ({
    type = ListProposalsType.ALL,
    status = ListProposalsStatus.ALL
  } = {}): Promise<ProposalInfo[]>
}

enum ListProposalsType {
  CFP = 'cfp',
  BRP = 'brp',
  VOC = 'voc',
  ALL = 'all'
}

enum ListProposalsStatus {
  VOTING = 'voting',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  ALL = 'all'
}

enum ProposalType {
  COMMUNITY_FUND_REQUEST = 'CommunityFundRequest',
  BLOCK_REWARD_RELLOCATION = 'BlockRewardRellocation',
  VOTE_OF_CONFIDENCE = 'VoteOfConfidence'
}

enum ProposalStatus {
  VOTING = 'Voting',
  REJECTED = 'Rejected',
  COMPLETED = 'Completed'
}

interface ProposalInfo {
  proposalId: string
  title: string
  type: ProposalType
  status: ProposalStatus
  amount: number
  cyclesPaid: number
  totalCycles: number
  finalizeAfter: number
  payoutAddress: string
}
```
