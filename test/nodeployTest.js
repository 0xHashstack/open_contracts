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

const { assert } = require('chai');
const {deployDiamond}= require('../scripts/deploy_all.js')
const {addMarkets}= require('../scripts/deploy_all.js')
const { provideLiquidity } = require("../scripts/deploy_all.js");

describe(" Test with deployed diamond ", function () {
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
		
		diamondAddress = "0x130aE5bAaD51baAcfa9DBEa9D5ee318667d05921"

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

		bepUsdt = await ethers.getContractAt('BEP20Token', "0xed75B7352ED8593409f24C98B11625156d5fd29d")
		bepBtc = await ethers.getContractAt('BEP20Token', "0x7E8f71849997ccd4dAF18c88988d05c3C26B7316")
		bepUsdc = await ethers.getContractAt('BEP20Token', "0x4c567834cFc2f2873c130760A0883d6c88087733")
        bepWbnb = await ethers.getContractAt('BEP20Token', "0x6c33ae96A928E342C906E5a12027ea5B1104Ef8D")
        bepCake = await ethers.getContractAt('BEP20Token', "0x43F06A3D225506201a4067c4fD6d2bB2D07fBC8D")
	})

    it('should have three facets -- call to facetAddresses function', async () => {
        for (const address of await diamondLoupeFacet.facetAddresses()) {
            addresses.push(address)
        }
        assert.equal(addresses.length, 10)
    })

    it('facets should have the right function selectors -- call to facetFunctionSelectors function', async () => {
        let selectors = getSelectors(diamondCutFacet)
        result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0])
        assert.sameMembers(result, selectors)
        selectors = getSelectors(diamondLoupeFacet)
        result = await diamondLoupeFacet.facetFunctionSelectors(addresses[1])
        assert.sameMembers(result, selectors)
    })

    it("Token Mint", async () => {
        console.log("Reserve balance is ", await bepUsdt.balanceOf(diamondAddress));
		// expect(await bepUsdt.balanceOf(deposit.address)).to.be.equal(0);
		await expect(bepUsdt.transfer(accounts[1].address, "500000000000000000000000")).to.emit(bepUsdt, 'Transfer');
		await expect(bepUsdc.transfer(accounts[1].address, "500000000000000000000000")).to.emit(bepUsdc, 'Transfer');
		await expect(bepBtc.transfer(accounts[1].address, "50000000000000")).to.emit(bepBtc, 'Transfer');
		await expect(bepCake.transfer(accounts[1].address, "500000000000000000000000")).to.emit(bepCake, 'Transfer');

		// await bepUsdt.transfer(upgradeAdmin.address, 10000000000000);
	})

    it("Check Deposit", async () => {
        const depositAmount = "500000000000000000000";

        console.log(diamondAddress, "USDC balance is ", await bepUsdc.balanceOf(diamondAddress))
        console.log(accounts[1].address, "USDC balance is ", await bepUsdc.balanceOf(accounts[1].address))
        console.log("Avbl Market reserve is ", await reserve.avblMarketReserves(symbolUsdc))
        // USDC
        await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);
        await deposit.connect(accounts[1]).depositRequest(symbolUsdc, comit_NONE, depositAmount, {gasLimit: 5000000})
        // expect(await bepUsdc.balanceOf(accounts[1].address)).to.equal(0xfe00)
        // expect(await reserve.avblMarketReserves(symbolUsdc)).to.equal(0x200)
        console.log(diamondAddress, "USDC balance is ", await bepUsdc.balanceOf(diamondAddress))
        console.log(accounts[1].address, "USDC balance is ", await bepUsdc.balanceOf(accounts[1].address))
        console.log("Avbl Market reserve is ", await reserve.avblMarketReserves(symbolUsdc))
    })

    it("Check loan", async () => {
        const loanAmount = "300000000000000000000"
        const collateralAmount = "200000000000000000000"
        console.log(accounts[1].address, "USDC balance is ", await bepUsdc.balanceOf(accounts[1].address))
        console.log("Avbl Market reserve is ", await reserve.avblMarketReserves(symbolUsdc))
        await bepUsdc.connect(accounts[1]).approve(diamondAddress, loanAmount);
        await loanExt.connect(accounts[1]).loanRequest(symbolUsdc, comit_ONEMONTH, loanAmount, symbolUsdc, collateralAmount, {gasLimit: 5000000})

        console.log(accounts[1].address, "USDC balance is ", await bepUsdc.balanceOf(accounts[1].address))
        console.log("Avbl Market reserve is ", await reserve.avblMarketReserves(symbolUsdc))
    })

    it("Swap", async () => {
        const loanAmount = "300000000000000000000"
        console.log(accounts[1].address, "USDC balance is ", await bepUsdc.balanceOf(accounts[1].address))
        console.log(accounts[1].address, "CAKE balance is ", await bepCake.balanceOf(accounts[1].address))
        
        await bepUsdc.connect(accounts[1]).approve(diamondAddress, loanAmount);
        await bepCake.connect(accounts[1]).approve(diamondAddress, loanAmount);
        await loan.connect(accounts[1]).swapLoan(symbolUsdc, comit_ONEMONTH, symbolCAKE, {gasLimit: 5000000,})

        console.log(accounts[1].address, "USDC balance is ", await bepUsdc.balanceOf(accounts[1].address))
        console.log(accounts[1].address, "CAKE balance is ", await bepCake.balanceOf(accounts[1].address))

    })

    // it("SwapToLoan", async () => {
    //     const loanAmount = "300000000000000000000"
    //     console.log(accounts[1].address, "USDC balance is ", await bepUsdc.balanceOf(accounts[1].address))
    //     console.log(accounts[1].address, "CAKE balance is ", await bepCake.balanceOf(accounts[1].address))

    //     await bepUsdc.connect(accounts[1]).approve(diamondAddress, loanAmount);
    //     await bepCake.connect(accounts[1]).approve(diamondAddress, loanAmount);
    //     await loan.connect(accounts[1]).swapToLoan(symbolCAKE, comit_ONEMONTH, symbolUsdc, {gasLimit: 5000000,})

    //     console.log(accounts[1].address, "USDC balance is ", await bepUsdc.balanceOf(accounts[1].address))
    //     console.log(accounts[1].address, "CAKE balance is ", await bepCake.balanceOf(accounts[1].address))

    // })
   
    it("Check liquidation1", async () => {
        const loanAmount = "50000000000000000000000000"
        await bepUsdc.connect(accounts[1]).approve(diamondAddress, loanAmount);
        await loanExt.connect(upgradeAdmin).liquidation(accounts[1].address, 1);
    })

    // it("Check getLatestPrice", async () => {
    //     const priceBtc = await oracle.connect(upgradeAdmin).getLatestPrice(symbolBtc);
    //     console.log("BTC price is ", priceBtc)
    // })
})
