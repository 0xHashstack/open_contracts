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

let reserve;
let library;
let tokenList;

describe("testing OracleOpen", async () => {
  before(async () => {
    array = await deployDiamond();
    diamondAddress = array["diamondAddress"];
    rets = await addMarkets(array);
    await provideLiquidity(rets);
    accounts = await ethers.getSigners();
  });

  describe("Reserves", async () => {
    const symbolWBNB =
      "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt =
      "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
    const symbolUsdc =
      "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc =
      "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t

    before(async () => {
      library = await ethers.getContractAt("LibOpen", diamondAddress);
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      reserve = await ethers.getContractAt("Reserve", diamondAddress);
    });

    it("Available Market reserves:", async () => {
      let x;
      x = BigNumber.from(await reserve.avblMarketReserves(symbolBtc));
      expect(x).to.not.equal(BigNumber.from(0));

      x = BigNumber.from(await reserve.avblMarketReserves(symbolUsdt));
      expect(x).to.not.equal(BigNumber.from(0));

      x = BigNumber.from(await reserve.avblMarketReserves(symbolUsdc));
      expect(x).to.not.equal(BigNumber.from(0));

      x = BigNumber.from(await reserve.avblMarketReserves(symbolWBNB));
      expect(x).to.not.equal(BigNumber.from(0));
    });

    it("Market reserves:", async () => {
      let x;
      x = BigNumber.from(await reserve.marketReserves(symbolBtc));
      expect(x).to.gt(BigNumber.from(0));

      x = BigNumber.from(await reserve.marketReserves(symbolUsdt));
      expect(x).to.gt(BigNumber.from(0));

      x = BigNumber.from(await reserve.marketReserves(symbolUsdc));
      expect(x).to.gt(BigNumber.from(0));

      x = BigNumber.from(await reserve.marketReserves(symbolWBNB));
      expect(x).to.gt(BigNumber.from(0));
    });

    it("Market Utilization:", async () => {
      let x;
      x = BigNumber.from(await reserve.marketUtilisation(symbolBtc));
      expect(x).to.equal(BigNumber.from(0));

      x = BigNumber.from(await reserve.marketUtilisation(symbolUsdt));
      expect(x).to.equal(BigNumber.from(0));

      x = BigNumber.from(await reserve.marketUtilisation(symbolUsdc));
      expect(x).to.equal(BigNumber.from(0));

      x = BigNumber.from(await reserve.marketUtilisation(symbolWBNB));
      expect(x).to.equal(BigNumber.from(0));
    });

    it("transferAnyBep20", async () => {
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      const reserveBalance = await bepUsdt.balanceOf(diamondAddress); 
      await reserve.connect(accounts[0]).transferAnyBEP20(rets["tUsdtAddress"], accounts[0].address, 10000000000);
      expect(await bepUsdt.balanceOf(diamondAddress)).to.equal(
        reserveBalance.sub(BigNumber.from(10000000000))
      );
    })
    
    
    it("Pause:", async () => {
      await reserve.pauseReserve();
      expect(await reserve.isPausedReserve()).to.equal(true);
      
      await reserve.unpauseReserve();
      expect(await reserve.isPausedReserve()).to.equal(false);
      
    });    
    
  });
});
