const { ethers } = require('hardhat')
const utils = require('ethers').utils

const { getSelectors, FacetCutAction } = require('./libraries/diamond.js')
async function deployDiamond() {
    const accounts = await ethers.getSigners()
    const contractOwner = await accounts[0]
    console.log(`contractOwner ${contractOwner.address}`)

    // deploy DiamondCutFacet
    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
    const diamondCutFacet = await DiamondCutFacet.deploy()
    await diamondCutFacet.deployed()

    console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

    // deploy Diamond
    const Diamond = await ethers.getContractFactory('OpenDiamond')
    const diamond = await Diamond.deploy(contractOwner.address, diamondCutFacet.address)
    await diamond.deployed()
    console.log('Diamond deployed:', diamond.address)

    // deploy DiamondInit
    // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
    // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
    const DiamondInit = await ethers.getContractFactory('DiamondInit')
    const diamondInit = await DiamondInit.deploy()
    await diamondInit.deployed()
    console.log('DiamondInit deployed:', diamondInit.address)

    // deploy facets
    console.log('')
    console.log('Deploying facets')
    const FacetNames = [
        'DiamondLoupeFacet'
    ]
    const cut = []
    for (const FacetName of FacetNames) {
        const Facet = await ethers.getContractFactory(FacetName)
        const facet = await Facet.deploy()
        await facet.deployed()
        console.log(`${FacetName} deployed: ${facet.address}`)
        cut.push({
            facetAddress: facet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(facet),
            facetId: 1
        })
    }

    // upgrade diamond with facets
    console.log('')
    // console.log('Diamond Cut:', cut)
    const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address)
    let tx
    let receipt
    // call to init function
    let functionCall = diamondInit.interface.encodeFunctionData('init')
    tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall)
    console.log('Diamond cut tx: ', tx.hash)
    receipt = await tx.wait()
    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }

    console.log('Completed diamond cut')

    await deployOpenFacets(diamond.address)
    
    return diamond.address
}

async function deployOpenFacets(diamondAddress) {
    const accounts = await ethers.getSigners()
    const contractOwner = accounts[0]
    console.log(" ==== Begin deployOpenFacets === ");
    // const diamondAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)

    console.log("Begin deploying facets");
    const OpenNames = [
        'TokenList',
        'Comptroller',
        'Liquidator',
        'Reserve',
        'OracleOpen',
        'Loan',
        'Loan1',
        'Deposit',
        'AccessRegistry'
    ]
    const opencut1 = []
    let facetId = 10;
    for (const FacetName of OpenNames) {
        const Facet = await ethers.getContractFactory(FacetName)
        const facet = await Facet.deploy()
        await facet.deployed()
        console.log(`${FacetName} deployed: ${facet.address}`)
        opencut1.push({
            facetAddress: facet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(facet),
            facetId :facetId
        })
        facetId ++;
    }

    console.log("Begin diamondcut facets");

    tx = await diamondCutFacet.diamondCut(
        opencut1, ethers.constants.AddressZero, '0x', { gasLimit: 8000000 }
    )
    receipt = await tx.wait()


    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }

}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
    deployDiamond()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error)
        process.exit(1)
      })
}
  exports.deployDiamond = deployDiamond
  exports.deployOpenFacets = deployOpenFacets
