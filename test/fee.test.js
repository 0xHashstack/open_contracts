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

let accessRegistry;
let comptroller;
let library;
let tokenList;

describe("testing fees in Comptroller", async () => {
  before(async () => {
    array = await deployDiamond();
    diamondAddress = array["diamondAddress"];
    rets = await addMarkets(array);
    accounts = await ethers.getSigners();
  });

  describe("Comptroller: Fee Updation Check", async () => {
    const comit_NONE = utils.formatBytes32String("comit_NONE");
    const comit_TWOWEEKS = utils.formatBytes32String("comit_TWOWEEKS");
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    const comit_THREEMONTHS = utils.formatBytes32String("comit_THREEMONTHS");
    const adminComptroller = utils.formatBytes32String("adminComptroller");

    before(async () => {
      // deploying relevant contracts
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      comptroller = await ethers.getContractAt("Comptroller", diamondAddress);
      accessRegistry = await ethers.getContractAt("AccessRegistry", rets["accessRegistryAddress"]);
    });
    it("Set Loan Issuance Fee", async () => {
        await expect(comptroller.connect(accounts[1]).updateLoanIssuanceFees(10)).to.be.reverted;
        await expect(comptroller.updateLoanIssuanceFees(10)).emit(comptroller, "LoanIssuanceFeesUpdated");
      });
  
      it("Set Loan Closure Fee", async () => {
        await expect(comptroller.connect(accounts[1]).updateLoanClosureFees(5)).to.be.reverted;
        await expect(comptroller.updateLoanClosureFees(5)).emit(comptroller, "LoanClosureFeesUpdated");
      });
  
      it("Set Deposit pre Closure Fee", async () => {
        await expect(comptroller.connect(accounts[1]).updateDepositPreclosureFees(36)).to.be.reverted;
        await expect(comptroller.updateDepositPreclosureFees(36)).emit(comptroller, "DepositPreClosureFeesUpdated");
  
        expect(await comptroller.depositPreClosureFees()).to.equal(BigNumber.from(36));
      });
  
      it("Set Withdrawal Fee", async () => {
        await expect(comptroller.connect(accounts[1]).updateWithdrawalFees(17)).to.be.reverted;
        await expect(comptroller.updateWithdrawalFees(17)).emit(comptroller, "DepositWithdrawalFeesUpdated");
  
        expect(await comptroller.depositWithdrawalFees()).to.equal(BigNumber.from(17));
      });
  
      it("Set Collateral release Fee", async () => {
        await expect(comptroller.connect(accounts[1]).updateCollateralReleaseFees(10)).to.be.reverted;
        await expect(comptroller.updateCollateralReleaseFees(10)).emit(comptroller, "CollateralReleaseFeesUpdated");
  
        expect(await comptroller.collateralReleaseFees()).to.equal(BigNumber.from(10));
      });
  
      it("Set MarketSwap Fee", async () => {
        await expect(comptroller.connect(accounts[1]).updateMarketSwapFees(5)).to.be.reverted;
        await expect(comptroller.updateMarketSwapFees(5)).emit(comptroller, "MarketSwapFeesUpdated");
        
      });
    });
  });
  