const { expect } = require("chai");
const { ethers } = require("hardhat");
const utils = require('ethers').utils
const {
    getSelectors,
    get,
    FacetCutAction,
    removeSelectors,
    findAddressPositionInFacets
    } = require('../scripts/libraries/diamond.js')

const { assert } = require('chai')

const {deployDiamond}= require('../scripts/deploy_all.js')
const {addMarkets}= require('../scripts/deploy_all.js')

describe(" Complex Test ", function () {
    let diamondAddress
	let diamondCutFacet
	let diamondLoupeFacet
	let tokenList
	let comptroller
	let deposit
    let loan
    let loanExt
	let oracle
    let reserve
	let library
	let liquidator
	let accounts
	let upgradeAdmin
	let bepUsdt
	let bepBtc
	let bepUsdc
    let bepCake

	let rets
	const addresses = []

	const symbolWBNB = "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
	const symbolUsdt = "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
	const symbolUsdc = "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
	const symbolBtc = "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t
	const symbolEth = "0x4554480000000000000000000000000000000000000000000000000000000000";
	const symbolSxp = "0x5358500000000000000000000000000000000000000000000000000000000000"; // SXP
	const symbolCAKE = "0x43414b4500000000000000000000000000000000000000000000000000000000"; // CAKE
	
	const comit_NONE = utils.formatBytes32String("comit_NONE");
	const comit_TWOWEEKS = utils.formatBytes32String("comit_TWOWEEKS");
	const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
	const comit_THREEMONTHS = utils.formatBytes32String("comit_THREEMONTHS");

    before(async function () {
        accounts = await ethers.getSigners()
		upgradeAdmin = accounts[0]
		console.log("account1 is ", accounts[1].address)
		
		diamondAddress = await deployDiamond()
		rets = await addMarkets(diamondAddress)

		diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
		diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
		library = await ethers.getContractAt('LibOpen', diamondAddress)

		tokenList = await ethers.getContractAt('TokenList', diamondAddress)
		comptroller = await ethers.getContractAt('Comptroller', diamondAddress)
		deposit = await ethers.getContractAt("Deposit", diamondAddress)
		loan = await ethers.getContractAt("Loan", diamondAddress)
		loanExt = await ethers.getContractAt("LoanExt", diamondAddress)
		oracle = await ethers.getContractAt('OracleOpen', diamondAddress)
		liquidator = await ethers.getContractAt('Liquidator', diamondAddress)
		reserve = await ethers.getContractAt('Reserve', diamondAddress)

		bepUsdt = await ethers.getContractAt('BEP20Token', rets['tUsdtAddress'])
		bepBtc = await ethers.getContractAt('BEP20Token', rets['tBtcAddress'])
		bepUsdc = await ethers.getContractAt('BEP20Token', rets['tUsdcAddress'])
        bepWbnb = await ethers.getContractAt('BEP20Token', rets['tUsdcAddress'])
        bepCake = await ethers.getContractAt('BEP20Token', rets['tCakeAddress'])
	})

    it('should have 11 facets -- call to facetAddresses function', async () => {
        for (const address of await diamondLoupeFacet.facetAddresses()) {
            addresses.push(address)
        }
        assert.equal(addresses.length, 11)
    })

    it('facets should have the right function selectors -- call to facetFunctionSelectors function', async () => {
        let selectors = getSelectors(diamondCutFacet)
        result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0])
        assert.sameMembers(result, selectors)
        selectors = getSelectors(diamondLoupeFacet)
        result = await diamondLoupeFacet.facetFunctionSelectors(addresses[1])
        assert.sameMembers(result, selectors)
    })

    it("should get all the facets and function selectors of the diamond -- call to facets function", async () => {
      result = await diamondLoupeFacet.facets();
      assert.equal(result[0].facetAddress, addresses[0]);
      assert.equal(result[1].facetAddress, addresses[1]);
      assert.equal(result[2].facetAddress, addresses[2]);
      assert.equal(result[3].facetAddress, addresses[3]);
      assert.equal(result[4].facetAddress, addresses[4]);
      assert.equal(result[5].facetAddress, addresses[5]);
      assert.equal(result[6].facetAddress, addresses[6]);
      assert.equal(result[7].facetAddress, addresses[7]);
    });
})
