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
const TOKENS_DECIMAL = 8;

let accessRegistry;
let comptroller;
let dynamicInterest;
let loan1;
let tokenList;

describe.skip("testing Dynamic Interest", async () => {
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

  describe("Comptroller: Getter Methods", async () => {
    const comit_NONE = utils.formatBytes32String("comit_NONE");
    const comit_TWOWEEKS = utils.formatBytes32String("comit_TWOWEEKS");
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    const comit_THREEMONTHS = utils.formatBytes32String("comit_THREEMONTHS");
    const adminDynamicInterest = utils.formatBytes32String("adminDynamicInterest");

    const symbolWBNB = "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt = "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
    const symbolUsdc = "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc = "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t

    const pancakeRouterAddr = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";

    before(async () => {
      // deploying relevant contracts
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      comptroller = await ethers.getContractAt("Comptroller", diamondAddress);
      dynamicInterest = await ethers.getContractAt("DynamicInterest", diamondAddress);
      loan1 = await ethers.getContractAt("Loan1", diamondAddress);
      accessRegistry = await ethers.getContractAt("AccessRegistry", rets["accessRegistryAddress"]);

      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tWBNBAddress"]);
      bepCake = await ethers.getContractAt("BEP20Token", rets["tCakeAddress"]);
      bepSxp = await ethers.getContractAt("BEP20Token", rets["tSxpAddress"]);
      pancakeRouter = await ethers.getContractAt("PancakeRouter", pancakeRouterAddr);

      await expect(dynamicInterest.setDepositInterests(200, 1000)).emit(dynamicInterest, "DepositInterestUpdated");
      await expect(dynamicInterest.setBorrowInterests(500, 2000)).emit(dynamicInterest, "BorrowInterestUpdated");
      await expect(dynamicInterest.setInterestFactors(2, 12)).emit(dynamicInterest, "InterestFactorsUpdated");
    });

    it("Pause DynamicInterest", async () => {
      await dynamicInterest.pauseDynamicInterest();
      expect(await dynamicInterest.isPausedDynamicInterest()).to.equal(true);

      await dynamicInterest.unpauseDynamicInterest();
      expect(await dynamicInterest.isPausedDynamicInterest()).to.equal(false);

      await expect(dynamicInterest.connect(accounts[1]).pauseDynamicInterest()).to.be.reverted;

      await expect(accessRegistry.addAdminRole(adminDynamicInterest, accounts[1].address)).emit(
        accessRegistry,
        "AdminRoleDataGranted",
      );

      await expect(accessRegistry.addAdminRole(adminDynamicInterest, accounts[1].address)).to.be.reverted;

      await dynamicInterest.connect(accounts[1]).pauseDynamicInterest();
      expect(await dynamicInterest.isPausedDynamicInterest()).to.equal(true);

      await expect(accessRegistry.removeAdminRole(adminDynamicInterest, accounts[1].address)).emit(
        accessRegistry,
        "AdminRoleDataRevoked",
      );

      await expect(dynamicInterest.connect(accounts[1]).unpauseDynamicInterest()).to.be.reverted;
      expect(await dynamicInterest.isPausedDynamicInterest()).to.equal(true);

      await dynamicInterest.unpauseDynamicInterest();
      expect(await dynamicInterest.isPausedDynamicInterest()).to.equal(false);
    });

    it("Update interests (Uf <= 25)", async () => {
      await expect(dynamicInterest.updateInterests(symbolBtc)).emit(dynamicInterest, "InterestsUpdated");

      let apr;
      apr = BigNumber.from(await comptroller.getAPR(symbolBtc, comit_NONE));
      expect(apr).to.equal(BigNumber.from(500)); // minimum value of borrowed interest

      let apy;
      apy = await comptroller.getAPY(symbolBtc, comit_THREEMONTHS);
      expect(apy).to.equal(BigNumber.from(0)); // Uf < 25, deposit interest = 0
    });

    it("Update interests (Uf <= 70)", async () => {
      const loanAmount = ethers.utils.parseUnits("3000000", TOKENS_DECIMAL);
      const collateralAmount = ethers.utils.parseUnits("2000000", TOKENS_DECIMAL);

      await bepBtc.approve(diamondAddress, collateralAmount);
      await expect(loan1.loanRequest(symbolBtc, comit_NONE, loanAmount, symbolBtc, collateralAmount)).emit(
        loan1,
        "NewLoan",
      );

      await expect(dynamicInterest.updateInterests(symbolBtc)).emit(dynamicInterest, "InterestsUpdated");

      // Uf < 70
      let apr;
      apr = BigNumber.from(await comptroller.getAPR(symbolBtc, comit_NONE));
      expect(apr).to.equal(BigNumber.from(896)); // Uf = 70, manually calculated the value which comes to be 896.3585

      let apy;
      apy = await comptroller.getAPY(symbolBtc, comit_THREEMONTHS);
      expect(apy).to.equal(BigNumber.from(640)); // manually calculated value = 640
    });

    it("Update interests (Uf > 70)", async () => {
      const loanAmount = ethers.utils.parseUnits("500000", TOKENS_DECIMAL);
      const collateralAmount = ethers.utils.parseUnits("200000", TOKENS_DECIMAL);

      await bepBtc.approve(diamondAddress, collateralAmount);
      await expect(loan1.loanRequest(symbolBtc, comit_ONEMONTH, loanAmount, symbolBtc, collateralAmount)).emit(
        loan1,
        "NewLoan",
      );

      await expect(dynamicInterest.updateInterests(symbolBtc)).emit(dynamicInterest, "InterestsUpdated");

      // Uf = 82
      let apr;
      apr = BigNumber.from(await comptroller.getAPR(symbolBtc, comit_NONE));
      expect(apr).to.equal(BigNumber.from(1076)); // manually calculated value comes 1076.0401

      apr = BigNumber.from(await comptroller.getAPR(symbolBtc, comit_ONEMONTH));
      expect(apr).to.equal(BigNumber.from(896));

      let apy;
      apy = await comptroller.getAPY(symbolBtc, comit_THREEMONTHS);
      expect(apy).to.equal(BigNumber.from(900));

      apy = await comptroller.getAPY(symbolBtc, comit_ONEMONTH);
      expect(apy).to.equal(BigNumber.from(750));

      apy = await comptroller.getAPY(symbolBtc, comit_TWOWEEKS);
      expect(apy).to.equal(BigNumber.from(625));
    });
  });
});
