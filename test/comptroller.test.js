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

let comptroller;
let library;
let tokenList;

describe("testing Comptroller", async () => {
  before(async () => {
    diamondAddress = await deployDiamond();
    rets = await addMarkets(diamondAddress);
    await provideLiquidity(rets);
    accounts = await ethers.getSigners();
  });

  describe("Comptroller: Getter Methods", async () => {

    const comit_NONE = utils.formatBytes32String("comit_NONE");
    const comit_TWOWEEKS = utils.formatBytes32String("comit_TWOWEEKS");
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    const comit_THREEMONTHS = utils.formatBytes32String("comit_THREEMONTHS");

    before(async () => {
      // deploying relevant contracts
      library = await ethers.getContractAt("LibOpen", diamondAddress);
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      comptroller = await ethers.getContractAt("Comptroller", diamondAddress);
    });

    it("Pause Comptroller", async () => {
      await comptroller.pauseComptroller();
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
      library = await ethers.getContractAt("LibOpen", diamondAddress);
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      comptroller = await ethers.getContractAt("Comptroller", diamondAddress);
    });

    it("Set APR", async () => {
      await expect(
          comptroller
          .updateAPR(comit_NONE, 2800)
        ).emit(comptroller, "APRupdated");

      let apy;
      apy = await comptroller.getAPR(comit_NONE);
      expect(apy).to.equal(BigNumber.from(2800));

      apy = await comptroller.getAprTimeLength(comit_NONE);
      expect(apy).to.equal(2);
    });

    it("Set APY", async () => {
      await expect(comptroller.updateAPY(comit_NONE, 2800)).emit(
        comptroller,
        "APYupdated"
      );

      let apy;
      apy = await comptroller.getAPY(comit_NONE);
      expect(apy).to.equal(BigNumber.from(2800));

      apy = await comptroller.getApyTimeLength(comit_NONE);
      expect(apy).to.equal(2);
    });

    it("Set Loan Issuance Fee", async () => {
      await expect(comptroller.updateLoanIssuanceFees(2800)).emit(
        comptroller,
        "LoanIssuanceFeesUpdated"
      );
    });

    it("Set Loan Closure Fee", async () => {
      await expect(comptroller.updateLoanClosureFees(2800)).emit(
        comptroller,
        "LoanClosureFeesUpdated"
      );
    });

    it("Set Loan pre Closure Fee", async () => {
      await expect(comptroller.updateLoanPreClosureFees(2800)).emit(
        comptroller,
        "LoanPreClosureFeesUpdated"
      );
    });

    it("Set Deposit pre Closure Fee", async () => {
      await expect(comptroller.updateDepositPreclosureFees(2800)).emit(
        comptroller,
        "DepositPreClosureFeesUpdated"
      );

      expect(await comptroller.depositPreClosureFees()).to.equal(BigNumber.from(2800));
    });

    it("Set Withdrawal Fee", async () => {
      await expect(comptroller.updateWithdrawalFees(2800)).emit(
        comptroller,
        "DepositWithdrawalFeesUpdated"
      );

      expect(await comptroller.depositWithdrawalFees()).to.equal(
        BigNumber.from(2800)
      );
    });

    it("Set Collateral release Fee", async () => {
      await expect(comptroller.updateCollateralReleaseFees(2800)).emit(
        comptroller,
        "CollateralReleaseFeesUpdated"
      );

      expect(await comptroller.collateralReleaseFees()).to.equal(
        BigNumber.from(2800)
      );
    });

    it("Set Yield Conversion Fee", async () => {
      await expect(comptroller.updateYieldConversion(2800)).emit(
        comptroller,
        "YieldConversionFeesUpdated"
      );
    });

    it("Set MarketSwap Fee", async () => {
      await expect(comptroller.updateMarketSwapFees(2800)).emit(
        comptroller,
        "MarketSwapFeesUpdated"
      );
    });

    it("Set ReserveFactor", async () => {
      await expect(comptroller.updateReserveFactor(1)).emit(
        comptroller,
        "ReserveFactorUpdated"
      );

      expect(await comptroller.getReserveFactor()).to.equal(BigNumber.from(1));
    });

    it("Set Max Withdrawal Limit", async () => {

      const x = (await ethers.provider.getBlock()).timestamp;
      await expect(comptroller.updateMaxWithdrawal(2800, x)).emit(
        comptroller,
        "MaxWithdrawalUpdated"
      );
    });

  });  
});