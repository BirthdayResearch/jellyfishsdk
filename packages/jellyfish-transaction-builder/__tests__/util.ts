/* eslint-disable */
import Web3 from 'web3';
import { ethers } from 'ethers';
import { JsonRpcResponse } from 'web3-core-helpers';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc';

const CHAIN_ID = 1133;

const RPC_PORT = 19554;
const ETH_PORT = 19551;

const DISPLAY_LOG = process.env.RUST_LOG;

const BINARY_PATH = process.env.DEFID;
const SPAWNING_TIME = 120_000;

const PRIV_KEYS = [
	{
		ownerAuthAddress: 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU',
		ownerPrivKey: 'cRiRQ9cHmy5evDqNDdEV8f6zfbK6epi9Fpz4CRZsmLEmkwy54dWz',
		operatorAuthAddress: 'mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy',
		operatorPrivKey: 'cPGEaz8AGiM71NGMRybbCqFNRcuUhg3uGvyY4TFE1BZC26EW2PkC',
	},
];

export async function customRequest(web3: Web3, method: string, params: any[]) {
	return new Promise<JsonRpcResponse>((resolve, reject) => {
		(web3.currentProvider as any).send(
			{
				jsonrpc: '2.0',
				id: 1,
				method,
				params,
			},
			(error: Error | null, result: JsonRpcResponse) => {
				if (error) {
					reject(
						`Failed to send custom request (${method} (${params.join(',')})): ${
							error.message || error.toString()
						}`
					);
				}
				resolve(result);
			}
		);
	});
}

// Create a block and finalize it.
// It will include all previously executed transactions since the last finalized block.
export async function generate(
	client: JsonRpcClient,
	nblocks: number,
	address?: string | undefined,
	maxTries: number = 1000000
): Promise<void> {
	if (!address) {
		address = await client.wallet.getNewAddress();
	}
	for (let minted = 0, tries = 0; minted < nblocks && tries < maxTries; tries++) {
		const result = await client.call('generatetoaddress', [1, address, 1], 'number');
		if (result === 1) {
			minted += 1;
		}
	}
}

let tmpDir: string;
export async function startDefid(): Promise<{
	web3: Web3;
	binary: ChildProcess;
	ethersjs: ethers.JsonRpcProvider;
	client: JsonRpcClient;
}> {
	const web3 = new Web3(`http://127.0.0.1:${ETH_PORT}`);
	const client = new JsonRpcClient(`http://test:test@127.0.0.1:${RPC_PORT}`);

	tmpDir = `/tmp/${uuidv4()}`;
	console.log('tmpDir: ', tmpDir)
	fs.mkdirSync(tmpDir);

	const cmd = BINARY_PATH || '';
	console.log('cmd: ', cmd)
	const args = [
		`-datadir=${tmpDir}`,
		'-regtest',
		'-gen=0',
		'-rpcpassword=test',
		'-rpcuser=test',
		'-jellyfish_regtest',
		'-logtimemicros',
		'-logthreadnames',
		'-debug',
		'-debugexclude=libevent',
		'-debugexclude=leveldb',
		'-debugexclude=accountchange',
		`-masternode_operator=${PRIV_KEYS[0].operatorAuthAddress}`,
		'-dummypos=1',
		'-txnotokens=1',
		// '-datacarriersize=40000', // Increase size of data for publishing smart contracts
	];

	const extraArgs = [
		'-dummypos=0',
		'-txnotokens=0',
		'-amkheight=50',
		'-bayfrontheight=51',
		'-eunosheight=80',
		'-fortcanningheight=82',
		'-fortcanninghillheight=84',
		'-fortcanningroadheight=86',
		'-fortcanningcrunchheight=88',
		'-fortcanningspringheight=90',
		'-fortcanninggreatworldheight=94',
		'-fortcanningepilogueheight=96',
		'-grandcentralheight=101',
		'-nextnetworkupgradeheight=105',
		'-subsidytest=1',
		'-txindex=1',
	];

	const binary = spawn(cmd, args.concat(extraArgs));

	binary.on('error', (err) => {
		if ((err as any).errno === 'ENOENT') {
			console.error(
				`\x1b[31mMissing Defid binary (${BINARY_PATH}).\nPlease compile the Defid\x1b[0m`
			);
		} else {
			console.error(err);
		}
		process.exit(1);
	});

	const binaryLogs: any[] = [];
	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(() => {
			console.error(`\x1b[31m Failed to start Defid Node.\x1b[0m`);
			// console.error(`Command: ${cmd} ${args.join(' ')}`);
			// console.error(`Logs:`);
			console.error(binaryLogs.map((chunk) => chunk.toString()).join('\n'));
			process.exit(1);
		}, SPAWNING_TIME - 15_000);

		const onData = async (chunk: any) => {
			if (DISPLAY_LOG) {
				console.log(chunk.toString());
			}

			binaryLogs.push(chunk);

			if (chunk.toString().match(/addcon thread start/)) {
				const chainId = await web3.eth.getChainId();
				console.log('chainId: ', chainId)

				clearTimeout(timer);
				console.log('zxcv')

				if (!DISPLAY_LOG) {
					binary.stderr.off('data', onData);
					binary.stdout.off('data', onData);
				}
				console.log(`\x1b[35m Starting RPC\x1b[0m`);

				await client.wallet.importPrivKey(PRIV_KEYS[0].ownerPrivKey);
				await client.wallet.importPrivKey(PRIV_KEYS[0].operatorPrivKey);

				await generate(client, 105);

				await client.masternode.setGov({
					ATTRIBUTES: {
						'v0/params/feature/evm': 'true',
						'v0/params/feature/transferdomain': 'true',
						'v0/transferdomain/dvm-evm/enabled': 'true',
						'v0/transferdomain/evm-dvm/enabled': 'true',
						'v0/transferdomain/dvm-evm/dat-enabled': 'true',
						'v0/transferdomain/evm-dvm/dat-enabled': 'true',
						'v0/transferdomain/dvm-evm/src-formats': ['p2pkh', 'bech32'],
						'v0/transferdomain/dvm-evm/dest-formats': ['erc55'],
						'v0/transferdomain/evm-dvm/src-formats': ['erc55'],
						'v0/transferdomain/evm-dvm/auth-formats': ['bech32-erc55'],
						'v0/transferdomain/evm-dvm/dest-formats': ['p2pkh', 'bech32']
					},
				});
				await generate(client, 2);

				resolve();
			}
		};
		binary.stderr.on('data', onData);
		binary.stdout.on('data', onData);
	});

	let ethersjs = new ethers.JsonRpcProvider(`http://127.0.0.1:${ETH_PORT}`, {
		chainId: CHAIN_ID,
		name: 'metachain-dev',
	});
	return { web3, binary, ethersjs, client };
}

export function describeWithDefid(
	title: string,
	cb: (context: { web3: Web3; client: JsonRpcClient }) => void,
) {
	describe(title, () => {
		let binary: ChildProcess;
		let context: {
			web3: Web3 | undefined;
			ethersjs: ethers.JsonRpcProvider | undefined;
			client: JsonRpcClient | undefined;
		} = { web3: undefined, ethersjs: undefined, client: undefined };

		beforeAll( async function () {
			jest.setTimeout(SPAWNING_TIME);
			try {
				const init = await startDefid();
				context.web3 = init.web3;
				context.ethersjs = init.ethersjs;
				context.client = init.client;
				binary = init.binary;
			} catch (e) {
				console.log('Error starting node', e);
			}
		});

		afterAll((done) => {
			console.log('afterAll')
			jest.setTimeout(30_000);
			const isRunning = require('is-running');
			const interval = setInterval(function () {
				if (!isRunning(binary.pid)) {
					clearInterval(interval);
					fs.rmdirSync(tmpDir, { recursive: true });
					done();
				}
			}, 500);

			binary.kill();
		});
		// @ts-ignore
		cb(context);
	});
}
/* eslint-disable */