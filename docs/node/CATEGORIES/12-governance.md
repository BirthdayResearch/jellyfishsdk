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
  contextHash?: string
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

Returns real time information about the proposal.

```ts title="client.governance.getGovProposal()"
interface governance {
  getGovProposal (proposalId: string): Promise<ProposalInfo>
}

enum ProposalType {
  COMMUNITY_FUND_PROPOSAL = 'CommunityFundProposal',
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
  context: string
  contextHash: string
  type: ProposalType
  status: ProposalStatus
  amount?: BigNumber
  currentCycle: number
  totalCycles: number
  creationHeight: number
  cycleEndHeight: number
  proposalEndHeight: number
  payoutAddress?: string
  votingPeriod: number
  approvalThreshold: string
  quorum: string
  votesPossible?: number
  votesPresent?: number
  votesPresentPct?: string
  votesYes?: number
  votesYesPct?: string
  fee: number
  options?: string[]
}
 ```

## createGovVoc

Creates a Vote of Confidence.

```ts title="client.governance.createGovVoc()"
interface governance {
  createGovVoc (data: VOCData, utxos: UTXO[] = []): Promise<string>
}

interface VOCData {
  title: string
  context: string
  contextHash?: string
  emergency?: boolean
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
  listGovProposals (options: ListProposalsOption = {}): Promise<ProposalInfo[]>
}

interface ListProposalsOptions {
  type?: ListProposalsType
  status?: ListProposalsStatus
  cycle?: number
  pagination?: ListProposalsPagination
}

interface ListProposalsPagination {
  start?: string
  including_start?: boolean
  limit?: number
}

enum ListProposalsType {
  CFP = 'cfp',
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
  COMMUNITY_FUND_PROPOSAL = 'CommunityFundProposal',
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
  context: string
  contextHash: string
  type: ProposalType
  status: ProposalStatus
  amount?: BigNumber
  currentCycle: number
  totalCycles: number
  creationHeight: number
  cycleEndHeight: number
  proposalEndHeight: number
  payoutAddress?: string
  votingPeriod: number
  approvalThreshold: string
  quorum: string
  votesPossible?: number
  votesPresent?: number
  votesPresentPct?: string
  votesYes?: number
  votesYesPct?: string
  fee: number
  options?: string[]
}
```

## voteGov

Vote on a community proposal.

```ts title="client.governance.voteGov()"
interface governance {
  voteGov (data: VoteData, utxos: UTXO[] = []): Promise<string>
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

## listGovProposalVotes

Returns information about proposal votes.

```ts title="client.governance.listGovProposalVotes()"
interface governance {
  listGovProposalVotes (options?: ListGovProposalVotesOptions): Promise<ListVotesResult[]>
}

enum MasternodeType {
  MINE = 'mine',
  ALL = 'all'
}

interface ListGovProposalVotesPagination {
  start?: number
  including_start?: boolean
  limit?: number
}

interface ListGovProposalVotesOptions {
  proposalId?: string
  masternode?: MasternodeType | string
  cycle?: number
  pagination?: ListGovProposalVotesPagination
  aggregate?: boolean
  valid?: boolean
}

interface ListVotesResult {
  proposalId: string
  masternodeId: string
  cycle: number
  vote: string
  valid: boolean
}
```
