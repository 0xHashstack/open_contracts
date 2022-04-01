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

describe("testing Comptroller", async () => {
  before(async () => {
    array = await deployDiamond();
    diamondAddress = array["diamondAddress"];
    rets = await addMarkets(array);
    accounts = await ethers.getSigners();
  });

  describe("Comptroller: Getter Methods", async () => {
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

    it("Pause Comptroller", async () => {
      await comptroller.pauseComptroller();
      expect(await comptroller.isPausedComptroller()).to.equal(true);

      await comptroller.unpauseComptroller();
      expect(await comptroller.isPausedComptroller()).to.equal(false);

      await expect(comptroller.connect(accounts[1]).pauseComptroller()).to.be.reverted;

      await expect(accessRegistry.addAdminRole(adminComptroller, accounts[1].address)).emit(
        accessRegistry,
        "AdminRoleDataGranted",
      );

      await expect(accessRegistry.addAdminRole(adminComptroller, accounts[1].address)).to.be.reverted;

      await comptroller.connect(accounts[1]).pauseComptroller();
      expect(await comptroller.isPausedComptroller()).to.equal(true);

      await expect(accessRegistry.removeAdminRole(adminComptroller, accounts[1].address)).emit(
        accessRegistry,
        "AdminRoleDataRevoked",
      );

      await expect(comptroller.connect(accounts[1]).unpauseComptroller()).to.be.reverted;
      expect(await comptroller.isPausedComptroller()).to.equal(true);

      await comptroller.unpauseComptroller();
      expect(await comptroller.isPausedComptroller()).to.equal(false);
    });

    it("Get APR", async () => {
      let apr;
      apr = BigNumber.from(await comptroller.getAPR(comit_NONE));
      expect(apr).to.equal(BigNumber.from(1800));

      apr = BigNumber.from(await comptroller.getAPR(comit_ONEMONTH));
      expect(apr).to.equal(BigNumber.from(1500));
    });

    it("Get APY", async () => {
      let apy;
      apy = await comptroller.getAPY(comit_NONE);
      expect(apy).to.equal(BigNumber.from(780));

      apy = await comptroller.getAPY(comit_TWOWEEKS);
      expect(apy).to.equal(BigNumber.from(1000));

      apy = await comptroller.getAPY(comit_ONEMONTH);
      expect(apy).to.equal(BigNumber.from(1500));

      apy = await comptroller.getAPY(comit_THREEMONTHS);
      expect(apy).to.equal(BigNumber.from(1800));
    });

    it("Get APR LastTime", async () => {
      let apr;
      apr = await comptroller.getAprLastTime(comit_NONE);
      expect(apr).to.not.equal(0);

      apr = await comptroller.getAprLastTime(comit_TWOWEEKS);
      expect(apr).to.not.equal(0);

      apr = await comptroller.getAprLastTime(comit_ONEMONTH);
      expect(apr).to.not.equal(0);

      apr = await comptroller.getAprLastTime(comit_THREEMONTHS);
      expect(apr).to.not.equal(0);
    });

    it("Get APY LastTime", async () => {
      let apy;
      apy = await comptroller.getApyLastTime(comit_NONE);
      expect(apy).to.not.equal(0);

      apy = await comptroller.getApyLastTime(comit_TWOWEEKS);
      expect(apy).to.not.equal(0);

      apy = await comptroller.getApyLastTime(comit_ONEMONTH);
      expect(apy).to.not.equal(0);

      apy = await comptroller.getApyLastTime(comit_THREEMONTHS);
      expect(apy).to.not.equal(0);
    });

    it("Get APR Ind", async () => {
      let apy;
      apy = await comptroller.getAPRInd(comit_NONE, 0);
      expect(apy).to.equal(BigNumber.from(1800));

      apy = await comptroller.getAPRInd(comit_TWOWEEKS, 0);
      expect(apy).to.equal(BigNumber.from(1800));

      apy = await comptroller.getAPRInd(comit_ONEMONTH, 0);
      expect(apy).to.equal(BigNumber.from(1500));

      apy = await comptroller.getAPRInd(comit_THREEMONTHS, 0);
      expect(apy).to.equal(BigNumber.from(1500));
    });
    it("Get APY Ind", async () => {
      let apy;
      apy = await comptroller.getAPYInd(comit_NONE, 0);
      expect(apy).to.equal(BigNumber.from(780));

      apy = await comptroller.getAPYInd(comit_TWOWEEKS, 0);
      expect(apy).to.equal(BigNumber.from(1000));

      apy = await comptroller.getAPYInd(comit_ONEMONTH, 0);
      expect(apy).to.equal(BigNumber.from(1500));

      apy = await comptroller.getAPYInd(comit_THREEMONTHS, 0);
      expect(apy).to.equal(BigNumber.from(1800));
    });

    it("Get APR Time ", async () => {
      let apr;
      apr = await comptroller.getAprtime(comit_NONE, 0);
      expect(apr).to.not.equal(0);

      apr = await comptroller.getAprtime(comit_TWOWEEKS, 0);
      expect(apr).to.not.equal(0);

      apr = await comptroller.getAprtime(comit_ONEMONTH, 0);
      expect(apr).to.not.equal(0);

      apr = await comptroller.getAprtime(comit_THREEMONTHS, 0);
      expect(apr).to.not.equal(0);
    });

    it("Get APY Time ", async () => {
      let apr;
      apr = await comptroller.getApytime(comit_NONE, 0);
      expect(apr).to.not.equal(0);

      apr = await comptroller.getApytime(comit_TWOWEEKS, 0);
      expect(apr).to.not.equal(0);

      apr = await comptroller.getApytime(comit_ONEMONTH, 0);
      expect(apr).to.not.equal(0);

      apr = await comptroller.getApytime(comit_THREEMONTHS, 0);
      expect(apr).to.not.equal(0);
    });

    it("Get APR Time Length", async () => {
      let apr;
      apr = await comptroller.getAprTimeLength(comit_NONE);
      expect(apr).to.equal(1);

      apr = await comptroller.getAprTimeLength(comit_TWOWEEKS);
      expect(apr).to.equal(1);

      apr = await comptroller.getAprTimeLength(comit_ONEMONTH);
      expect(apr).to.equal(1);

      apr = await comptroller.getAprTimeLength(comit_THREEMONTHS);
      expect(apr).to.equal(1);
    });

    it("Get APY Time Length", async () => {
      let apy;
      apy = await comptroller.getApyTimeLength(comit_NONE);
      expect(apy).to.equal(1);

      apy = await comptroller.getApyTimeLength(comit_TWOWEEKS);
      expect(apy).to.equal(1);

      apy = await comptroller.getApyTimeLength(comit_ONEMONTH);
      expect(apy).to.equal(1);

      apy = await comptroller.getApyTimeLength(comit_THREEMONTHS);
      expect(apy).to.equal(1);
    });

    it("Get Commitment", async () => {
      let apy;
      apy = await comptroller.getCommitment(0);
      expect(apy).to.equal(comit_NONE);

      apy = await comptroller.getCommitment(1);
      expect(apy).to.equal(comit_TWOWEEKS);
    });
  });

  describe("Comptroller: Setter Methods", async () => {
    const comit_NONE = utils.formatBytes32String("comit_NONE");
    const comit_TWOWEEKS = utils.formatBytes32String("comit_TWOWEEKS");
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    const comit_THREEMONTH = utils.formatBytes32String("comit_THREEMONTH");

    before(async () => {
      // deploying relevant contracts
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      comptroller = await ethers.getContractAt("Comptroller", diamondAddress);
    });

    it("Set APR", async () => {
      await expect(comptroller.connect(accounts[1]).updateAPR(comit_NONE, 2800)).to.be.reverted;

      await expect(comptroller.updateAPR(comit_NONE, 2800)).emit(comptroller, "APRupdated");

      let apy;
      apy = await comptroller.getAPR(comit_NONE);
      expect(apy).to.equal(BigNumber.from(2800));

      apy = await comptroller.getAprTimeLength(comit_NONE);
      expect(apy).to.equal(2);
    });

    it("Set APY", async () => {
      await expect(comptroller.connect(accounts[1]).updateAPY(comit_NONE, 2800)).to.be.reverted;
      await expect(comptroller.updateAPY(comit_NONE, 2800)).emit(comptroller, "APYupdated");

      let apy;
      apy = await comptroller.getAPY(comit_NONE);
      expect(apy).to.equal(BigNumber.from(2800));

      apy = await comptroller.getApyTimeLength(comit_NONE);
      expect(apy).to.equal(2);
    });

    it("Set Loan Issuance Fee", async () => {
      await expect(comptroller.connect(accounts[1]).updateLoanIssuanceFees(10)).to.be.reverted;
      await expect(comptroller.updateLoanIssuanceFees(10)).emit(comptroller, "LoanIssuanceFeesUpdated");
    });

    it("Set Loan Closure Fee", async () => {
      await expect(comptroller.connect(accounts[1]).updateLoanClosureFees(5)).to.be.reverted;
      await expect(comptroller.updateLoanClosureFees(5)).emit(comptroller, "LoanClosureFeesUpdated");
    });

    it("Set Loan pre Closure Fee", async () => {
      await expect(comptroller.connect(accounts[1]).updateLoanPreClosureFees(36)).to.be.reverted;
      await expect(comptroller.updateLoanPreClosureFees(36)).emit(comptroller, "LoanPreClosureFeesUpdated");
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

    it("Set Yield Conversion Fee", async () => {
      await expect(comptroller.connect(accounts[1]).updateYieldConversion(10)).to.be.reverted;
      await expect(comptroller.updateYieldConversion(10)).emit(comptroller, "YieldConversionFeesUpdated");
    });

    it("Set MarketSwap Fee", async () => {
      await expect(comptroller.connect(accounts[1]).updateMarketSwapFees(5)).to.be.reverted;
      await expect(comptroller.updateMarketSwapFees(5)).emit(comptroller, "MarketSwapFeesUpdated");
    });

    it("Set ReserveFactor", async () => {
      await expect(comptroller.connect(accounts[1]).updateReserveFactor(1)).to.be.reverted;
      await expect(comptroller.updateReserveFactor(1)).emit(comptroller, "ReserveFactorUpdated");

      expect(await comptroller.getReserveFactor()).to.equal(BigNumber.from(1));
    });

    it("Set Max Withdrawal Limit", async () => {
      const x = (await ethers.provider.getBlock()).timestamp;

      await expect(comptroller.connect(accounts[1]).updateMaxWithdrawal(2800, x)).to.be.reverted;

      await expect(comptroller.updateMaxWithdrawal(2800, x)).emit(comptroller, "MaxWithdrawalUpdated");
    });
  });
});
