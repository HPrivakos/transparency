import BigNumber from 'bignumber.js'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'

import PROPOSALS from '../public/proposals.json'
import VESTING_ABI from './abi/vesting.json'
import { ProposalParsed } from './export-proposals'
import { Category, GovernanceProposalType } from './interfaces/GovernanceProposal'
import { Decimals, Token } from './interfaces/Network'
import { saveToCSV, saveToJSON } from './utils'

require('dotenv').config()

interface Grant {
  grant_category?: Category
  grant_tier?: string
  grant_size?: number
  grant_beneficiary?: string
  token?: Token
  released?: number
  releasable?: number
}

export type GrantProposal = Grant & ProposalParsed

const web3 = new Web3(process.env.INFURA_URL)

const DECIMALS = {
  "0x0f5d2fb29fb7d3cfee444a200298f468908cc942": [Token.MANA, Decimals.MANA],
  "0x6b175474e89094c44da98b954eedeac495271d0f": [Token.DAI, Decimals.DAI],
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": [Token.USDC, Decimals.USDC],
  "0xdac17f958d2ee523a2206206994597c13d831ec7": [Token.USDT, Decimals.USDT],
}

async function main() {
  // Get Gobernance dApp Proposals
  const proposals: GrantProposal[] = PROPOSALS.filter(p => p.type === GovernanceProposalType.GRANT)

  for (const p of proposals) {
    p.grant_category = p.configuration.category
    p.grant_tier = p.configuration.tier.split(':')[0]
    p.grant_size = p.configuration.size
    p.grant_beneficiary = p.configuration.beneficiary

    if (p.vesting_address) {
      const contract = new web3.eth.Contract(VESTING_ABI as AbiItem[], p.vesting_address)
      const token: string = (await contract.methods.token().call()).toLowerCase()
      const decimals: number = DECIMALS[token][1]
      p.token = DECIMALS[token][0]

      p.released = await contract.methods.released().call()
      p.released = new BigNumber(p.released).dividedBy(10 ** decimals).toNumber()

      p.releasable = await contract.methods.releasableAmount().call()
      p.releasable = new BigNumber(p.releasable).dividedBy(10 ** decimals).toNumber()
    }
  }

  console.log(proposals.length, 'grants found.')

  saveToJSON('grants.json', proposals)
  saveToCSV('grants.csv', proposals, [
    { id: 'id', title: 'Proposal ID' },
    { id: 'snapshot_id', title: 'Snapshot ID' },
    { id: 'user', title: 'Author' },

    { id: 'title', title: 'Title' },
    { id: 'status', title: 'Status' },
    { id: 'start_at', title: 'Started' },
    { id: 'finish_at', title: 'Ended' },
    { id: 'required_to_pass', title: 'Threshold' },
    { id: 'scores_total', title: 'Total VP' },

    { id: 'grant_category', title: 'Category' },
    { id: 'grant_tier', title: 'Tier' },
    { id: 'grant_size', title: 'Amount USD' },
    { id: 'grant_beneficiary', title: 'Beneficiary' },
    { id: 'vesting_address', title: 'Vesting Contract' },

    { id: 'token', title: 'Token' },
    { id: 'released', title: 'Released Amount' },
    { id: 'releasable', title: 'Releasable Amount' },
  ])
}

main()