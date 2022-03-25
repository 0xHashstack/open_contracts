const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const utils = require("ethers").utils;

const { deployDiamond, provideLiquidity } = require("../scripts/deploy_all.js");
const { addMarkets } = require("../scripts/deploy_all.js");

let diamondAddress;
let rets;
let accounts;

let library;
let tokenList;

describe("testing tokenList", async () => {
  before(async () => {
    array = await deployDiamond();
    diamondAddress = array["diamondAddress"];
    rets = await addMarkets(array);
    await provideLiquidity(rets);
    accounts = await ethers.getSigners();
  });

  describe("Token List", async () => {
    const symbolWBNB =
      "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt =
      "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
    const symbolUsdc =
      "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc =
      "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t
    const symbolSxp =
      "0x5358500000000000000000000000000000000000000000000000000000000000"; // SXP
    const symbolCAKE =
      "0x43414b4500000000000000000000000000000000000000000000000000000000"; // CAKE

    before(async () => {
      library = await ethers.getContractAt("LibOpen", diamondAddress);
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
    });

    it("Primary Market Support:", async () => {
      expect(await tokenList.isMarketSupported(symbolBtc)).to.equal(true);

      expect(await tokenList.isMarketSupported(symbolUsdc)).to.equal(true);

      expect(await tokenList.isMarketSupported(symbolUsdt)).to.equal(true);

      expect(await tokenList.isMarketSupported(symbolWBNB)).to.equal(true);

      expect(tokenList.isMarketSupported(symbolCAKE)).to.be.reverted;

    });

    it("Secondary Market Support:", async () => {
      expect(await tokenList.isMarket2Supported(symbolCAKE)).to.equal(true);

      expect(await tokenList.isMarket2Supported(symbolSxp)).to.equal(true);

      expect(tokenList.isMarket2Supported(symbolUsdc)).to.be.reverted;

    });   
    
    it("Primary Market Removal:", async () => {

      await expect(tokenList.removeMarketSupport(symbolBtc)).emit(
        tokenList,
        "MarketSupportRemoved"
      );
      expect(tokenList.isMarketSupported(symbolBtc)).to.be.reverted;
    });

    it("Add Primary Market", async () => {
      await expect(
        tokenList.addMarketSupport(symbolBtc, 6, rets["tBtcAddress"], 100000000)
      ).emit(tokenList, "MarketSupportAdded");
      expect(await tokenList.isMarketSupported(symbolBtc)).to.equal(true);
    });

    it("Update Primary Market", async () => {
      await expect(
        tokenList.updateMarketSupport(symbolBtc, 8, rets["tBtcAddress"])
      ).emit(tokenList, "MarketSupportUpdated");
      expect(await tokenList.isMarketSupported(symbolBtc)).to.equal(true);
    });

    it("Secondary Market Removal", async () => {
      await expect(tokenList.removeMarket2Support(symbolCAKE)).emit(
        tokenList,
        "Market2Removed"
      );
      expect(tokenList.isMarketSupported(symbolCAKE)).to.be.reverted;
    });

    it("Add Secondary Market", async () => {
      await expect(
        tokenList.addMarket2Support(symbolCAKE, 6, rets["tCakeAddress"])
      ).emit(tokenList, "Market2Added");
      expect(await tokenList.isMarket2Supported(symbolCAKE)).to.equal(true);
    });

    it("Update Secondary Market:", async () => {
      await expect(
        tokenList.updateMarket2Support(symbolCAKE, 8, rets["tCakeAddress"])
      ).emit(tokenList, "Market2Updated");
      expect(await tokenList.isMarket2Supported(symbolCAKE)).to.equal(true);
    });

    it("Get Primary Market Address:", async () => {
      expect(await tokenList.getMarketAddress(symbolBtc)).to.equal(
        rets["tBtcAddress"]
      );
    });

    it("Get Primary Market Decimal:", async () => {
      expect(await tokenList.getMarketDecimal(symbolBtc)).to.equal(
        BigNumber.from(8)
      );
    });

    it("Min Amount check:", async () => {
      expect(tokenList.minAmountCheck(symbolUsdc, 10000000)).to.be.reverted;
    });

    it("Get Secondary Market Address:", async () => {
      expect(await tokenList.getMarket2Address(symbolCAKE)).to.equal(rets["tCakeAddress"]);
    });

    it("Get Secondary Market Decimal:", async () => {
      expect(await tokenList.getMarket2Decimal(symbolCAKE)).to.equal(
        BigNumber.from(8)
      );
    });

    it("Pause:", async () => {
      await tokenList.pauseTokenList();
      expect(await tokenList.isPausedTokenList()).to.equal(true);

      await tokenList.unpauseTokenList();
      expect(await tokenList.isPausedTokenList()).to.equal(false);
    });
  });
});
