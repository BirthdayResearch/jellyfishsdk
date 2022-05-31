---
id: governance
title: Governance API
sidebar_label: Governance API
slug: /jellyfish/api/governance
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

// Using client.governance.
const something = await client.governance.method()
```

## createGovCfp

Creates a Community Fund Proposal.

```ts title="client.governance.createGovCfp()"
interface governance {
  createGovCfp (data: CFPData, utxos: UTXO[] = []): Promise<string>
}

interface CFPData {
  title: string
  context: string
  amount: BigNumber
  payoutAddress: string
  cycles?: number
}

interface UTXO {
  txid: string
  vout: number
}
```

## getGovProposal

Returns information about the proposal.

```ts title="client.governance.getGovProposal()"
interface governance {
  getGovProposal (proposalId: string): Promise<ProposalInfo>
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

## createGovVoc

Creates a Vote of Confidence.

```ts title="client.governance.createGovVoc()"
interface governance {
  createGovVoc (title: string, context: string, utxos: UTXO[] = []): Promise<string>
}

interface UTXO {
  txid: string
  vout: number
}
```

## listGovProposals

Returns list of proposals.

```ts title="client.governance.listGovProposals()"
interface governance {
  async listGovProposals ({
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
  COMPLETED = 'Completed',
  APPROVED = 'Approved'
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
  approval: string
  validity: string
  ends: string
}
```

## voteGov

Vote on a community proposal.

```ts title="client.governance.voteGov()"
interface governance {
  async voteGov (data: VoteData, utxos: UTXO[] = []): Promise<string>
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

## listGovVotes

Returns information about proposal votes.

```ts title="client.governance.listGovVotes()"
interface governance {
  async listGovVotes (proposalId: string, masternode: MasternodeType | string = MasternodeType.MINE): Promise<ListVotesResult[]>
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
