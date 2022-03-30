const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, waffle } = require("hardhat");
const utils = require("ethers").utils;

const { deployDiamond, provideLiquidity } = require("../scripts/deploy_all.js");
const { addMarkets } = require("../scripts/deploy_all.js");
const TOKENS_DECIMAL = 8;

let diamondAddress;
let rets;
let accounts;

let loan;
let loan1;
let loan2;
let accessRegistry;
let faucet;
let library;
let tokenList;
let bepBtc;
let bepUsdc;
let bepUsdt;
let bepWbnb;
let bepCake;
let bepSxp;
let pancakeRouter;

describe("Liquidation", async () => {
  before(async () => {
    array = await deployDiamond();
    diamondAddress = array["diamondAddress"];
    rets = await addMarkets(array);
    await provideLiquidity(rets);
    accounts = await ethers.getSigners();
    faucet = await ethers.getContractAt("Faucet", rets["faucetAddress"]);
    await expect(faucet.connect(accounts[1]).getTokens(0)).emit(faucet, "TokensIssued");

    await expect(faucet.connect(accounts[1]).getTokens(1)).emit(faucet, "TokensIssued");

    await expect(faucet.connect(accounts[1]).getTokens(2)).emit(faucet, "TokensIssued");

    await expect(faucet.connect(accounts[1]).getTokens(3)).emit(faucet, "TokensIssued");
  });

  describe("Liquidation", async () => {
    const symbolWbnb = "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt = "0x555344542e740000000000000000000000000000000000000000000000000000"; // Usdt.t
    const symbolUsdc = "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc = "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t
    const symbolSxp = "0x5358500000000000000000000000000000000000000000000000000000000000"; // SXP
    const symbolCAKE = "0x43414b4500000000000000000000000000000000000000000000000000000000"; // CAKE
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    const comit_NONE = utils.formatBytes32String("comit_NONE");
    const comit_TWOWEEKS = utils.formatBytes32String("comit_TWOWEEKS");
    const pancakeRouterAddr = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";

    before(async () => {
      // deploying relevant contracts
      loan1 = await ethers.getContractAt("Loan1", diamondAddress);
      oracle = await ethers.getContractAt("OracleOpen", diamondAddress);
      liquidator = await ethers.getContractAt("Liquidator", diamondAddress);
      deposit = await ethers.getContractAt("Deposit", diamondAddress);

      // deploying tokens
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tWBNBAddress"]);
      bepCake = await ethers.getContractAt("BEP20Token", rets["tCakeAddress"]);
      bepSxp = await ethers.getContractAt("BEP20Token", rets["tSxpAddress"]);
      pancakeRouter = await ethers.getContractAt("PancakeRouter", pancakeRouterAddr);
    });

    describe("Community liquidation", async () => {
      it("DC3 Liquidation", async () => {
        const loanAmount = ethers.utils.parseUnits("80000", TOKENS_DECIMAL);
        const collateralAmount = ethers.utils.parseUnits("1", TOKENS_DECIMAL);
        const accounts = await ethers.getSigners();
        const upgradeAdmin = accounts[0];

        const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));
        await bepBtc.connect(accounts[1]).approve(diamondAddress, collateralAmount);
        await expect(
          loan1.connect(accounts[1]).loanRequest(symbolUsdc, comit_ONEMONTH, loanAmount, symbolBtc, collateralAmount),
        ).emit(loan1, "NewLoan");

        // make liquidator eligible
        const depositAmount = ethers.utils.parseUnits("2500", TOKENS_DECIMAL);

        await bepUsdt.connect(accounts[0]).approve(diamondAddress, depositAmount);
        await deposit.connect(accounts[0]).depositRequest(symbolUsdt, comit_TWOWEEKS, depositAmount);

        expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
          reserveBalance.add(BigNumber.from(collateralAmount)),
        );

        console.log("quote before swap:", ethers.utils.formatEther(await oracle.getQuote(symbolBtc)));
        console.log("quote before swap:", await oracle.getQuote(symbolUsdc));

        // Decrease price so that loan gets liquidated
        await bepBtc
          .connect(accounts[0])
          .approve(pancakeRouter.address, ethers.utils.parseUnits("1000", TOKENS_DECIMAL));
        await pancakeRouter
          .connect(accounts[0])
          .swapExactTokensForTokens(
            ethers.utils.parseUnits("1000", TOKENS_DECIMAL),
            1,
            [rets["tBtcAddress"], rets["tWBNBAddress"]],
            upgradeAdmin.address,
            Date.now() + 1000 * 60 * 10,
          );

        console.log("quote after swap:", ethers.utils.formatEther(await oracle.getQuote(symbolBtc)));
        console.log("quote after swap:", await oracle.getQuote(symbolUsdc));

        let prevLoanAssetBalance = await bepUsdc.balanceOf(accounts[0].address);
        let prevCollateralAssetBalance = await bepBtc.balanceOf(accounts[0].address);

        let prevDiamondLoanAssetBalance = await bepUsdc.balanceOf(diamondAddress);
        let prevDiamondCollateralAssetBalance = await bepBtc.balanceOf(diamondAddress);

        console.log("prev loan asset balance=====", ethers.utils.formatUnits(prevLoanAssetBalance, TOKENS_DECIMAL));
        console.log(
          "prev coll asset balance=====",
          ethers.utils.formatUnits(prevCollateralAssetBalance, TOKENS_DECIMAL),
        );

        console.log(
          "prev loan asset balance diamond=====",
          ethers.utils.formatUnits(prevDiamondLoanAssetBalance, TOKENS_DECIMAL),
        );
        console.log(
          "prev coll asset balance diamond=====",
          ethers.utils.formatUnits(prevDiamondCollateralAssetBalance, TOKENS_DECIMAL),
        );

        await bepUsdc.connect(accounts[0]).approve(diamondAddress, loanAmount);
        await expect(liquidator.connect(accounts[0]).liquidation(accounts[1].address, symbolUsdc, comit_ONEMONTH)).emit(
          liquidator,
          "Liquidation",
        );

        let laterLoanAssetBalance = await bepUsdc.balanceOf(accounts[0].address);
        let laterCollateralAssetBalance = await bepBtc.balanceOf(accounts[0].address);

        let laterDiamondLoanAssetBalance = await bepUsdc.balanceOf(diamondAddress);
        let laterDiamondCollateralAssetBalance = await bepBtc.balanceOf(diamondAddress);

        console.log("post loan asset balance=====", ethers.utils.formatUnits(laterLoanAssetBalance, TOKENS_DECIMAL));
        console.log(
          "post coll asset balance=====",
          ethers.utils.formatUnits(laterCollateralAssetBalance, TOKENS_DECIMAL),
        );
        console.log(
          "post loan asset balance diamond=====",
          ethers.utils.formatUnits(laterDiamondLoanAssetBalance, TOKENS_DECIMAL),
        );
        console.log(
          "post coll asset balance diamond=====",
          ethers.utils.formatUnits(laterDiamondCollateralAssetBalance, TOKENS_DECIMAL),
        );
        expect(laterCollateralAssetBalance).to.be.gt(prevCollateralAssetBalance);
      });

      it.skip("DC2 Liquidation", async () => {
        const loanAmount = ethers.utils.parseUnits("10", TOKENS_DECIMAL);
        const collateralAmount = ethers.utils.parseUnits("7", TOKENS_DECIMAL);
        const accounts = await ethers.getSigners();
        const upgradeAdmin = accounts[0];

        const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));
        // console.log('bnb balance below');
        // console.log(await bepWbnb.balanceOf(accounts[1].address));
        await bepWbnb.connect(accounts[1]).approve(diamondAddress, collateralAmount);
        await expect(
          loan1.connect(accounts[1]).loanRequest(symbolWbnb, comit_ONEMONTH, loanAmount, symbolWbnb, collateralAmount),
        ).emit(loan1, "NewLoan");

        // make liquidator eligible
        const depositAmount = ethers.utils.parseUnits("2500", TOKENS_DECIMAL);

        await bepUsdt.connect(accounts[0]).approve(diamondAddress, depositAmount);
        await deposit.connect(accounts[0]).depositRequest(symbolUsdt, comit_TWOWEEKS, depositAmount);

        expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.equal(
          reserveBalance.add(BigNumber.from(collateralAmount)),
        );

        console.log("quote before swap:", ethers.utils.formatEther(await oracle.getQuote(symbolWbnb)));

        // Decrease price so that loan gets liquidated
        await bepWbnb
          .connect(accounts[0])
          .approve(pancakeRouter.address, ethers.utils.parseUnits("100000000", TOKENS_DECIMAL));
        await pancakeRouter
          .connect(accounts[0])
          .swapExactTokensForTokens(
            ethers.utils.parseUnits("100000000", TOKENS_DECIMAL),
            1,
            [rets["tWBNBAddress"], rets["tUsdtAddress"]],
            upgradeAdmin.address,
            Date.now() + 1000 * 60 * 10,
          );

        console.log("quote after swap:", ethers.utils.formatEther(await oracle.getQuote(symbolUsdt)));

        let prevLoanAssetBalance = await bepWbnb.balanceOf(accounts[0].address);

        let prevDiamondLoanAssetBalance = await bepWbnb.balanceOf(diamondAddress);

        console.log("prev loan asset balance=====", ethers.utils.formatUnits(prevLoanAssetBalance, TOKENS_DECIMAL));

        console.log(
          "prev loan asset balance diamond=====",
          ethers.utils.formatUnits(prevDiamondLoanAssetBalance, TOKENS_DECIMAL),
        );

        await bepWbnb.connect(accounts[0]).approve(diamondAddress, loanAmount);
        await expect(liquidator.connect(accounts[0]).liquidation(accounts[1].address, symbolWbnb, comit_ONEMONTH)).emit(
          liquidator,
          "Liquidation",
        );

        let laterLoanAssetBalance = await bepWbnb.balanceOf(accounts[0].address);

        let laterDiamondLoanAssetBalance = await bepWbnb.balanceOf(diamondAddress);

        console.log("prev loan asset balance=====", ethers.utils.formatUnits(laterLoanAssetBalance, TOKENS_DECIMAL));
        console.log(
          "prev loan asset balance diamond=====",
          ethers.utils.formatUnits(laterDiamondLoanAssetBalance, TOKENS_DECIMAL),
        );
        expect(laterCollateralAssetBalance).to.be.gt(prevCollateralAssetBalance);
      });

      it.skip("DC1 Liquidation", async () => {
        const loanAmount = ethers.utils.parseUnits("2800", TOKENS_DECIMAL);
        const collateralAmount = ethers.utils.parseUnits("3000", TOKENS_DECIMAL);
        const accounts = await ethers.getSigners();
        const upgradeAdmin = accounts[0];

        const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));
        await bepUsdt.connect(accounts[1]).approve(diamondAddress, collateralAmount);
        await expect(
          loan1.connect(accounts[1]).loanRequest(symbolUsdt, comit_ONEMONTH, loanAmount, symbolUsdt, collateralAmount),
        ).emit(loan1, "NewLoan");

        // make liquidator eligible
        const depositAmount = ethers.utils.parseUnits("2500", TOKENS_DECIMAL);

        await bepUsdt.connect(accounts[0]).approve(diamondAddress, depositAmount);
        await deposit.connect(accounts[0]).depositRequest(symbolUsdt, comit_TWOWEEKS, depositAmount);

        expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
          reserveBalance.add(BigNumber.from(collateralAmount)),
        );

        console.log("quote before swap:", ethers.utils.formatEther(await oracle.getQuote(symbolUsdt)));

        // Decrease price so that loan gets liquidated
        await bepUsdt
          .connect(accounts[0])
          .approve(pancakeRouter.address, ethers.utils.parseUnits("1000", TOKENS_DECIMAL));
        await pancakeRouter
          .connect(accounts[0])
          .swapExactTokensForTokens(
            ethers.utils.parseUnits("1000", TOKENS_DECIMAL),
            1,
            [rets["tUsdtAddress"], rets["tWBNBAddress"]],
            upgradeAdmin.address,
            Date.now() + 1000 * 60 * 10,
          );

        console.log("quote after swap:", ethers.utils.formatEther(await oracle.getQuote(symbolUsdt)));

        let prevLoanAssetBalance = await bepUsdt.balanceOf(accounts[0].address);

        let prevDiamondLoanAssetBalance = await bepUsdt.balanceOf(diamondAddress);

        console.log("prev loan asset balance=====", ethers.utils.formatUnits(prevLoanAssetBalance, TOKENS_DECIMAL));

        console.log(
          "prev loan asset balance diamond=====",
          ethers.utils.formatUnits(prevDiamondLoanAssetBalance, TOKENS_DECIMAL),
        );

        await bepUsdt.connect(accounts[0]).approve(diamondAddress, loanAmount);
        await expect(liquidator.connect(accounts[0]).liquidation(accounts[1].address, symbolUsdt, comit_ONEMONTH)).emit(
          liquidator,
          "Liquidation",
        );

        let laterLoanAssetBalance = await bepUsdt.balanceOf(accounts[0].address);

        let laterDiamondLoanAssetBalance = await bepUsdt.balanceOf(diamondAddress);

        console.log("prev loan asset balance=====", ethers.utils.formatUnits(laterLoanAssetBalance, TOKENS_DECIMAL));
        console.log(
          "prev loan asset balance diamond=====",
          ethers.utils.formatUnits(laterDiamondLoanAssetBalance, TOKENS_DECIMAL),
        );
        expect(laterCollateralAssetBalance).to.be.gt(prevCollateralAssetBalance);
      });
    });
  });
});
