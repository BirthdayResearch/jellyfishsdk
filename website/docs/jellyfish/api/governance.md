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

Creates a Community Fund Request.

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
  amount: BigNumber
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
  createVoc (title: string, utxos: UTXO[] = []): Promise<string>
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
  listProposals ({
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
  amount: BigNumber
  cyclesPaid: number
  totalCycles: number
  finalizeAfter: number
  payoutAddress: string
}
```

## vote

Vote on a community proposal.

```ts title="client.governance.vote()"
interface governance {
  vote (data: VoteData, utxos: UTXO[] = []): Promise<string>
}

enum VoteDecision {
  YES = 'yes',
  NO = 'no',
  NEUTRAL = 'neutral'
}

interface VoteData {
  proposalId: string
  masternodeId: string
  decision: VoteDecision
}

interface UTXO {
  txid: string
  vout: number
}
```

## listVotes

Returns information about proposal votes.

```ts title="client.governance.listVotes()"
interface governance {
  async listVotes (proposalId: string, masternode: MasternodeType | string = MasternodeType.MINE): Promise<ListVotesResult[]>
}

enum MasternodeType {
  MINE = 'mine',
  ALL = 'all'
}

interface ListVotesResult {
  proposalId: string
  masternodeId: string
  cycle: number
  vote: string
}
```
