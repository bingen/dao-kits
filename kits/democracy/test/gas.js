require('dotenv').config({ path: './node_modules/@aragon/kits-beta-base/.env'})
const getContract = name => artifacts.require(name)
const namehash = require('eth-ens-namehash').hash
const getKit = async (networkName) => {
    let arappFilename
    if (networkName == 'devnet' || networkName == 'rpc') {
        arappFilename = 'arapp_local'
    } else {
        arappFilename = 'arapp'
    }
    const arappFile = require('../' + arappFilename)
    const ensAddress = arappFile.environments[networkName].registry
    const ens = getContract('ENS').at(ensAddress)
    const kitEnsName = arappFile.environments[networkName].appName
    const repoAddr = await artifacts.require('PublicResolver').at(await ens.resolver(namehash('aragonpm.eth'))).addr(namehash(kitEnsName))
    const repo = getContract('Repo').at(repoAddr)
    const kitAddress = (await repo.getLatest())[1]
    const kitContractName = arappFile.path.split('/').pop().split('.sol')[0]
    const kit = getContract(kitContractName).at(kitAddress)

    return new Promise((resolve) => resolve(kit))
}

const pct16 = x => new web3.BigNumber(x).times(new web3.BigNumber(10).toPower(16))

contract('Democracy Kit', accounts => {
    let kit

    const owner = process.env.OWNER //'0x1f7402f55e142820ea3812106d0657103fc1709e'
    const holder20 = accounts[6]
    const holder29 = accounts[7]
    const holder51 = accounts[8]
    let indexObj = require('../arapp_local')

    const neededSupport = pct16(50)
    const minimumAcceptanceQuorum = pct16(20)
    const votingTime = 10

    context('Use Kit', async () => {
        let tokenGas
        before(async () => {
            kit = await getKit('devnet')
            //kit = await getKit(indexObj, 'DemocracyKit')
        })

        it('create token', async () => {
            const r = await kit.newToken('DemocracyToken', 'DTT', { from: owner })
            tokenGas = parseInt(r.receipt.cumulativeGasUsed, 10)
        })

        it('create new instance', async () => {
            const holders = [holder20, holder29, holder51]
            const stakes = [20e18, 29e18, 51e18]

            const r = await kit.newInstance('DemocracyDao-' + Math.random() * 1000, holders, stakes, neededSupport, minimumAcceptanceQuorum, votingTime, { from: owner })
            const instanceGas = parseInt(r.receipt.cumulativeGasUsed, 10)
            console.log('Token gas:   ', tokenGas)
            console.log('Instance gas:', instanceGas)
            console.log('Total gas:   ', tokenGas + instanceGas)
        })
    })
})
