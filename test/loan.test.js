const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, waffle } = require("hardhat");
const utils = require("ethers").utils;

const { deployDiamond, provideLiquidity } = require("../scripts/deploy_all.js");
const { addMarkets } = require("../scripts/deploy_all.js");

let diamondAddress;
let rets;
let accounts;

let loan;
let loanExt;
let loanExtv1;
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

describe("testing Loans", async () => {
  before(async () => {
    array = await deployDiamond();
    diamondAddress = array["diamondAddress"];
    rets = await addMarkets(array);
    await provideLiquidity(rets);
    accounts = await ethers.getSigners();
    faucet = await ethers.getContractAt("Faucet", rets["faucetAddress"]);
    await expect(faucet.connect(accounts[1]).getTokens(0)).emit(
      faucet,
      "TokensIssued"
    );

    await expect(faucet.connect(accounts[1]).getTokens(1)).emit(
      faucet,
      "TokensIssued"
    );

    await expect(faucet.connect(accounts[1]).getTokens(2)).emit(
      faucet,
      "TokensIssued"
    );

    await expect(faucet.connect(accounts[1]).getTokens(3)).emit(
      faucet,
      "TokensIssued"
    );
  });

  describe("USDT Test: Loan (Commit None)", async () => {
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
    const comit_NONE = utils.formatBytes32String("comit_NONE");
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    before(async () => {
      // deploying relevant contracts
      library = await ethers.getContractAt("LibOpen", diamondAddress);
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      loan = await ethers.getContractAt("Loan", diamondAddress);
      loanExt = await ethers.getContractAt("LoanExt", diamondAddress);
      loanExtv1 = await ethers.getContractAt("LoanExtv1", diamondAddress);
      accessRegistry = await ethers.getContractAt(
        "AccessRegistry",
        rets["accessRegistryAddress"]
      );

      // deploying tokens
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tWBNBAddress"]);
      bepCake = await ethers.getContractAt("BEP20Token", rets["tCakeAddress"]);
      bepSxp = await ethers.getContractAt("BEP20Token", rets["tSxpAddress"]);
    });

    it("USDT New Loan (1:4 CDR)", async () => {
      const loanAmount = 40000000000;
      const collateralAmount = 10000000000;

      const reserveBalance = BigNumber.from(
        await bepUsdt.balanceOf(diamondAddress)
      );
      await bepUsdt
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolUsdt,
            comit_NONE,
            loanAmount,
            symbolUsdt,
            collateralAmount
          )
      ).to.be.reverted;

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );

      expect(await loanExt.avblReservesLoan(symbolUsdt)).to.equal(BigNumber.from(0));
      expect(await loanExt.utilisedReservesLoan(symbolUsdt)).to.equal(
        BigNumber.from(0)
      );
    });

    it("USDT New Loan", async () => {
      const loanAmount = 30000000000;
      const collateralAmount = 20000000000;

      const reserveBalance = BigNumber.from(
        await bepUsdt.balanceOf(diamondAddress)
      );
      await bepUsdt
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolUsdt,
            comit_NONE,
            loanAmount,
            symbolUsdt,
            collateralAmount
          )
      ).emit(loanExt, "NewLoan");

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
        reserveBalance.add(BigNumber.from(collateralAmount))
      );
    });

    it("USDT New Loan (Retry)", async () => {
      const loanAmount = 30000000000;
      const collateralAmount = 20000000000;

      const reserveBalance = BigNumber.from(
        await bepUsdt.balanceOf(diamondAddress)
      );
      await bepUsdt
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolUsdt,
            comit_NONE,
            loanAmount,
            symbolUsdt,
            collateralAmount
          )
      ).to.be.reverted;

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("USDT Add Collateral", async () => {
      const collateralAmount = 20000000000;

      expect(await loanExt.hasLoanAccount(accounts[1].address)).to.equal(true);

      const loans = await loanExt.getLoans(accounts[1].address);

      expect(loans).to.not.equal(null);

      const reserveBalance = BigNumber.from(
        await bepUsdt.balanceOf(diamondAddress)
      );
      await bepUsdt
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loan
          .connect(accounts[1])
          .addCollateral(symbolUsdt, comit_NONE, collateralAmount)
      ).emit(loan, "AddCollateral");

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
        reserveBalance.add(BigNumber.from(collateralAmount))
      );
    });

    it("USDT Withdraw Loan (Trying more than permissible)", async () => {
      const withdrawAmount = 35000000000;
      const reserveBalance = BigNumber.from(
        await bepUsdt.balanceOf(diamondAddress)
      );

      await expect(
        loan
          .connect(accounts[1])
          .withdrawPartialLoan(symbolUsdt, comit_NONE, withdrawAmount)
      ).to.be.reverted;

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("Swap Loan", async () => {
      const reserveBalance = BigNumber.from(
        await bepUsdt.balanceOf(diamondAddress)
      );
      await expect(
        loan.connect(accounts[1]).swapLoan(symbolUsdt, comit_NONE, symbolCAKE)
      ).emit(loan, "MarketSwapped");

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.lt(
        BigNumber.from(reserveBalance)
      );
    });

    it("Swap to Loan", async () => {
      const reserveBalance = BigNumber.from(
        await bepUsdt.balanceOf(diamondAddress)
      );
      await expect(
        loan.connect(accounts[1]).swapToLoan(symbolUsdt, comit_NONE)
      ).emit(loan, "MarketSwapped");

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.gt(
        BigNumber.from(reserveBalance)
      );
    });

    it("USDT Withdraw Loan", async () => {
      const withdrawAmount = 25000000000;
      const reserveBalance = BigNumber.from(
        await bepUsdt.balanceOf(diamondAddress)
      );

      await expect(
        loan
          .connect(accounts[1])
          .withdrawPartialLoan(symbolUsdt, comit_NONE, withdrawAmount)
      ).emit(loan, "WithdrawPartialLoan");

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
        reserveBalance.sub(BigNumber.from(withdrawAmount))
      );
    });

    it("USDT Get Loan Interests", async () => {
      const currentProvider = waffle.provider;
      await currentProvider.send("evm_increaseTime", [86400]);
      await currentProvider.send("evm_mine");
      
      const [loanInterest, collateralInterest] = await loan.getLoanInterest(accounts[1].address, 1);
      expect(BigNumber.from(loanInterest)).to.gt(BigNumber.from(0));

      expect(BigNumber.from(collateralInterest)).to.equal(BigNumber.from(0));
    });

    it("Repay Loan", async () => {
      const repayAmount = 90000000000;
      const reserveBalance = BigNumber.from(
        await bepUsdt.balanceOf(diamondAddress)
      );

      await bepUsdt.connect(accounts[1]).approve(diamondAddress, repayAmount);
      await expect(
        loanExtv1
          .connect(accounts[1])
          .repayLoan(symbolUsdt, comit_NONE, repayAmount)
      ).emit(loanExtv1, "LoanRepaid");

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.lt(
        BigNumber.from(reserveBalance)
      );
    });
  });

  describe("Btc Test: Loan (Fixed)", async () => {
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
    // const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");

    before(async () => {
      // deploying relevant contracts
      library = await ethers.getContractAt("LibOpen", diamondAddress);
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      loan = await ethers.getContractAt("Loan", diamondAddress);
      loanExt = await ethers.getContractAt("LoanExt", diamondAddress);
      loanExtv1 = await ethers.getContractAt("LoanExtv1", diamondAddress);

      // deploying tokens
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tWBNBAddress"]);
      bepCake = await ethers.getContractAt("BEP20Token", rets["tCakeAddress"]);
      bepSxp = await ethers.getContractAt("BEP20Token", rets["tSxpAddress"]);
    });

    it("BTC New Loan (1:4 CDR)", async () => {
      const loanAmount = 40000000000;
      const collateralAmount = 10000000000;

      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );
      await bepBtc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolBtc,
            comit_ONEMONTH,
            loanAmount,
            symbolBtc,
            collateralAmount
          )
      ).to.be.reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("Btc New Loan (Cross Market)", async () => {
      const loanAmount = 17000000; // 0.15 Btc
      const collateralAmount = 20000000; // 0.2 BTC

      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );
      await bepBtc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolBtc,
            comit_ONEMONTH,
            loanAmount,
            symbolBtc,
            collateralAmount
          )
      ).emit(loanExt, "NewLoan");

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
        reserveBalance.add(BigNumber.from(collateralAmount))
      );
    });

    it("Btc New Loan (Retry)", async () => {
      const loanAmount = 300000000;
      const collateralAmount = 200000000;

      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );
      await bepBtc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolBtc,
            comit_ONEMONTH,
            loanAmount,
            symbolBtc,
            collateralAmount
          )
      ).to.be.reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("Btc Add Collateral", async () => {
      const collateralAmount = 15000000; // 0.15 BTC

      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );
      await bepBtc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loan
          .connect(accounts[1])
          .addCollateral(symbolBtc, comit_ONEMONTH, collateralAmount)
      ).emit(loan, "AddCollateral");

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
        reserveBalance.add(BigNumber.from(collateralAmount))
      );
    });

    it("Swap Loan", async () => {
      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );
      const reserveBal = await bepCake.balanceOf(diamondAddress);
      await expect(
        loan
          .connect(accounts[1])
          .swapLoan(symbolBtc, comit_ONEMONTH, symbolCAKE)
      ).emit(loan, "MarketSwapped");

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.lt(
        BigNumber.from(reserveBalance)
      );
      expect(BigNumber.from(await bepCake.balanceOf(diamondAddress))).to.gt(
        BigNumber.from(reserveBal)
      );
    });

    it("Swap Loan (2nd Attempt)", async () => {
      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );
      const reserveBal = await bepSxp.balanceOf(diamondAddress);
      await expect(
        loan.connect(accounts[1]).swapLoan(symbolBtc, comit_ONEMONTH, symbolSxp)
      ).to.be.reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
      expect(BigNumber.from(await bepSxp.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBal)
      );
    });

    it("Swap to Loan", async () => {
      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );
      const reserveBal = await bepCake.balanceOf(diamondAddress);
      await expect(
        loan.connect(accounts[1]).swapToLoan(symbolBtc, comit_ONEMONTH)
      ).emit(loan, "MarketSwapped");

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.gt(
        BigNumber.from(reserveBalance)
      );
      expect(BigNumber.from(await bepCake.balanceOf(diamondAddress))).to.lt(
        BigNumber.from(reserveBal)
      );
    });

    it("Swap to Loan (2nd Attempt)", async () => {
      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );
      const reserveBal = await bepSxp.balanceOf(diamondAddress);
      await expect(
        loan.connect(accounts[1]).swapToLoan(symbolBtc, comit_ONEMONTH)
      ).to.be.reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
      expect(BigNumber.from(await bepSxp.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBal)
      );
    });

    it("Btc Withdraw Loan", async () => {
      const withdrawAmount = 15000000;
      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );

      await expect(
        loan
          .connect(accounts[1])
          .withdrawPartialLoan(symbolBtc, comit_ONEMONTH, withdrawAmount)
      ).emit(loan, "WithdrawPartialLoan");

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
        reserveBalance.sub(BigNumber.from(withdrawAmount))
      );
    });

    it("Repay Loan", async () => {
      const repayAmount = 50000000; // 0.5 BTC
      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );

      await bepBtc.connect(accounts[1]).approve(diamondAddress, repayAmount);
      await expect(
        loanExtv1
          .connect(accounts[1])
          .repayLoan(symbolBtc, comit_ONEMONTH, repayAmount)
      ).emit(loanExtv1, "LoanRepaid");

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.gte(
        BigNumber.from(reserveBalance)
      );
    });
  });

  describe("Usdc Test: Loan (Commit None)", async () => {
    const symbolWBNB =
      "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt =
      "0x555344542e740000000000000000000000000000000000000000000000000000"; // Usdc.t
    const symbolUsdc =
      "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc =
      "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t
    const symbolSxp =
      "0x5358500000000000000000000000000000000000000000000000000000000000"; // SXP
    const symbolCAKE =
      "0x43414b4500000000000000000000000000000000000000000000000000000000"; // CAKE
    const comit_NONE = utils.formatBytes32String("comit_NONE");
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    before(async () => {
      // deploying relevant contracts
      library = await ethers.getContractAt("LibOpen", diamondAddress);
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      loan = await ethers.getContractAt("Loan", diamondAddress);
      loanExt = await ethers.getContractAt("LoanExt", diamondAddress);

      // deploying tokens
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepCake = await ethers.getContractAt("BEP20Token", rets["tCakeAddress"]);
      bepSxp = await ethers.getContractAt("BEP20Token", rets["tSxpAddress"]);
    });

    it("Usdc New Loan (1:4 CDR)", async () => {
      const loanAmount = 40000000000;
      const collateralAmount = 10000000000;

      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );
      await bepUsdc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolUsdc,
            comit_NONE,
            loanAmount,
            symbolUsdc,
            collateralAmount
          )
      ).to.be.reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("Usdc New Loan (Cross Market)", async () => {
      const loanAmount = 300000000000; // 3000 USDC
      const collateralAmount = 15000000; // 0.15 BTC

      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );
      await bepBtc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolUsdc,
            comit_NONE,
            loanAmount,
            symbolBtc,
            collateralAmount
          )
      ).emit(loanExt, "NewLoan");

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
        reserveBalance.add(BigNumber.from(collateralAmount))
      );
    });

    it("Usdc New Loan (Retry)", async () => {
      const loanAmount = 30000000000;
      const collateralAmount = 20000000000;

      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );
      await bepUsdc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolUsdc,
            comit_NONE,
            loanAmount,
            symbolUsdc,
            collateralAmount
          )
      ).to.be.reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("Usdc Add Collateral (Wrong Market)", async () => {
      const collateralAmount = 15000000000; // 150 USDC

      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );
      await bepUsdc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loan
          .connect(accounts[1])
          .addCollateral(symbolUsdc, comit_NONE, collateralAmount)
      ).to.be.reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("Usdc Add Collateral", async () => {
      const collateralAmount = 15000000; // 0.15 BTC

      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );
      await bepBtc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loan
          .connect(accounts[1])
          .addCollateral(symbolUsdc, comit_NONE, collateralAmount)
      ).emit(loan, "AddCollateral");

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
        reserveBalance.add(BigNumber.from(collateralAmount))
      );
    });

    it("Swap Loan", async () => {
      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );
      await expect(
        loan.connect(accounts[1]).swapLoan(symbolUsdc, comit_NONE, symbolCAKE)
      ).emit(loan, "MarketSwapped");

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.lt(
        BigNumber.from(reserveBalance)
      );
    });

    it("Swap to Loan", async () => {
      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );
      await expect(
        loan.connect(accounts[1]).swapToLoan(symbolUsdc, comit_NONE)
      ).emit(loan, "MarketSwapped");

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.gt(
        BigNumber.from(reserveBalance)
      );
    });

    it("Usdc Withdraw Loan", async () => {
      const withdrawAmount = 250000000000;
      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );

      await expect(
        loan
          .connect(accounts[1])
          .withdrawPartialLoan(symbolUsdc, comit_NONE, withdrawAmount)
      ).emit(loan, "WithdrawPartialLoan");

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.equal(
        reserveBalance.sub(BigNumber.from(withdrawAmount))
      );
    });

    it("Repay Loan", async () => {
      const repayAmount = 50000000000;
      const reserveBalance = BigNumber.from(
        await bepBtc.balanceOf(diamondAddress)
      );

      console.log("Pre RBal: ", reserveBalance);

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, repayAmount);
      await expect(
        loanExtv1
          .connect(accounts[1])
          .repayLoan(symbolUsdc, comit_NONE, repayAmount)
      ).emit(loanExtv1, "LoanRepaid");

      console.log(
        "Pos RBal: ",
        BigNumber.from(await bepBtc.balanceOf(diamondAddress))
      );
      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.lt(
        BigNumber.from(reserveBalance)
      );

    });
  });

  describe("Usdc Test: Loan 2(Commit None)", async () => {
    const symbolWBNB =
      "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt =
      "0x555344542e740000000000000000000000000000000000000000000000000000"; // Usdc.t
    const symbolUsdc =
      "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc =
      "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t
    const symbolSxp =
      "0x5358500000000000000000000000000000000000000000000000000000000000"; // SXP
    const symbolCAKE =
      "0x43414b4500000000000000000000000000000000000000000000000000000000"; // CAKE
    const comit_NONE = utils.formatBytes32String("comit_NONE");
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    before(async () => {
      // deploying relevant contracts
      library = await ethers.getContractAt("LibOpen", diamondAddress);
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      loan = await ethers.getContractAt("Loan", diamondAddress);
      loanExt = await ethers.getContractAt("LoanExt", diamondAddress);

      // deploying tokens
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepCake = await ethers.getContractAt("BEP20Token", rets["tCakeAddress"]);
      bepSxp = await ethers.getContractAt("BEP20Token", rets["tSxpAddress"]);
    });

    it("Usdc New Loan (1:4 CDR)", async () => {
      const loanAmount = 40000000000;
      const collateralAmount = 10000000000;

      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );
      await bepUsdc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolUsdc,
            comit_NONE,
            loanAmount,
            symbolUsdc,
            collateralAmount
          )
      ).to.be.reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("Usdc New Loan (Cross Market)", async () => {
      const loanAmount = 300000000000; // 3000 USDC
      const collateralAmount = 500000000000; 

      const reserveBalance = BigNumber.from(
        await bepUsdt.balanceOf(diamondAddress)
      );
      await bepUsdt
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolUsdc,
            comit_NONE,
            loanAmount,
            symbolUsdt,
            collateralAmount
          )
      ).emit(loanExt, "NewLoan");

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
        reserveBalance.add(BigNumber.from(collateralAmount))
      );
    });

    it("Usdc New Loan (Retry)", async () => {
      const loanAmount = 30000000000;
      const collateralAmount = 20000000000;

      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );
      await bepUsdc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolUsdc,
            comit_NONE,
            loanAmount,
            symbolUsdc,
            collateralAmount
          )
      ).to.be.reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("Usdc Add Collateral (Wrong Market)", async () => {
      const collateralAmount = 15000000000; // 150 USDC

      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );
      await bepUsdc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loan
          .connect(accounts[1])
          .addCollateral(symbolUsdc, comit_NONE, collateralAmount)
      ).to.be.reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });


    it("Swap Loan", async () => {
      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );
      await expect(
        loan.connect(accounts[1]).swapLoan(symbolUsdc, comit_NONE, symbolCAKE)
      ).emit(loan, "MarketSwapped");

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.lt(
        BigNumber.from(reserveBalance)
      );
    });

    it("Repay Loan", async () => {
      const repayAmount = 50000000000;
      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, repayAmount);
      await expect(
        loanExtv1
          .connect(accounts[1])
          .repayLoan(symbolUsdc, comit_NONE, repayAmount)
      ).emit(loanExtv1, "LoanRepaid");

      // expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.lt(
      //   BigNumber.from(reserveBalance)
      // );
    });
  });

  describe("Bnb Test: Loan (Fixed)", async () => {
    const symbolWbnb =
      "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt =
      "0x555344542e740000000000000000000000000000000000000000000000000000"; // Usdt.t
    const symbolUsdc =
      "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc =
      "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t
    const symbolSxp =
      "0x5358500000000000000000000000000000000000000000000000000000000000"; // SXP
    const symbolCAKE =
      "0x43414b4500000000000000000000000000000000000000000000000000000000"; // CAKE
    // const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");

    before(async () => {
      // deploying relevant contracts
      library = await ethers.getContractAt("LibOpen", diamondAddress);
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      loan = await ethers.getContractAt("Loan", diamondAddress);
      loanExt = await ethers.getContractAt("LoanExt", diamondAddress);
      loanExtv1 = await ethers.getContractAt("LoanExtv1", diamondAddress);
      accessRegistry = await ethers.getContractAt(
        "AccessRegistry",
        rets["accessRegistryAddress"]
      );

      // deploying tokens
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tWBNBAddress"]);
      bepCake = await ethers.getContractAt("BEP20Token", rets["tCakeAddress"]);
      bepSxp = await ethers.getContractAt("BEP20Token", rets["tSxpAddress"]);
    });

    it("Bnb New Loan (1:4 CDR)", async () => {
      const loanAmount = 40000000000;
      const collateralAmount = 10000000000;

      const reserveBalance = BigNumber.from(
        await bepWbnb.balanceOf(diamondAddress)
      );
      await bepWbnb
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolWbnb,
            comit_ONEMONTH,
            loanAmount,
            symbolWbnb,
            collateralAmount
          )
      ).to.be.reverted;

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("Wbnb New Loan", async () => {
      const loanAmount = 40000000; // 0.4 Wbnb
      const collateralAmount = 30000000; // 0.3 Wbnb

      const reserveBalance = BigNumber.from(
        await bepWbnb.balanceOf(diamondAddress)
      );
      await bepWbnb
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolWbnb,
            comit_ONEMONTH,
            loanAmount,
            symbolWbnb,
            collateralAmount
          )
      ).emit(loanExt, "NewLoan");

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.equal(
        reserveBalance.add(BigNumber.from(collateralAmount))
      );
    });

    it("Wbnb New Loan (Retry)", async () => {
      const loanAmount = 300000000;
      const collateralAmount = 200000000;

      const reserveBalance = BigNumber.from(
        await bepWbnb.balanceOf(diamondAddress)
      );
      await bepWbnb
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolWbnb,
            comit_ONEMONTH,
            loanAmount,
            symbolWbnb,
            collateralAmount
          )
      ).to.be.reverted;

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.equal(
        BigNumber.from(reserveBalance)
      );
    });

    it("Wbnb Add Collateral", async () => {
      const collateralAmount = 15000000; // 0.15 Wbnb

      const reserveBalance = BigNumber.from(
        await bepWbnb.balanceOf(diamondAddress)
      );
      await bepWbnb
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loan
          .connect(accounts[1])
          .addCollateral(symbolWbnb, comit_ONEMONTH, collateralAmount)
      ).emit(loan, "AddCollateral");

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.equal(
        reserveBalance.add(BigNumber.from(collateralAmount))
      );
    });

    it("Swap Loan", async () => {
      const reserveBalance = BigNumber.from(
        await bepWbnb.balanceOf(diamondAddress)
      );
      const reserveBal = await bepSxp.balanceOf(diamondAddress);
      await expect(
        loan
          .connect(accounts[1])
          .swapLoan(symbolWbnb, comit_ONEMONTH, symbolSxp)
      ).emit(loan, "MarketSwapped");

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.lt(
        BigNumber.from(reserveBalance)
      );
      expect(BigNumber.from(await bepSxp.balanceOf(diamondAddress))).to.gt(
        BigNumber.from(reserveBal)
      );
    });

    // it("Swap to Loan", async () => {
    //   const reserveBalance = BigNumber.from(
    //     await bepWbnb.balanceOf(diamondAddress)
    //   );
    //   const reserveBal = await bepSxp.balanceOf(diamondAddress);
    //   await expect(
    //     loan.connect(accounts[1]).swapToLoan(symbolWbnb, comit_ONEMONTH)
    //   ).emit(loan, "MarketSwapped");

    //   expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.gt(
    //     BigNumber.from(reserveBalance)
    //   );
    //   expect(BigNumber.from(await bepSxp.balanceOf(diamondAddress))).to.lt(
    //     BigNumber.from(reserveBal)
    //   );
    // });

    it("Wbnb Withdraw Loan", async () => {
      const withdrawAmount = 15000000;
      const reserveBalance = BigNumber.from(
        await bepWbnb.balanceOf(diamondAddress)
      );

      await expect(
        loan
          .connect(accounts[1])
          .withdrawPartialLoan(symbolWbnb, comit_ONEMONTH, withdrawAmount)
      ).to.be.reverted;

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.equal(
        reserveBalance);
    });

    it("Repay Loan", async () => {
      const repayAmount = 50000000; // 0.5 Wbnb
      const reserveBalance = BigNumber.from(
        await bepWbnb.balanceOf(diamondAddress)
      );

      await bepWbnb.connect(accounts[1]).approve(diamondAddress, repayAmount);
      await expect(
        loanExtv1
          .connect(accounts[1])
          .repayLoan(symbolWbnb, comit_ONEMONTH, repayAmount)
      ).emit(loanExtv1, "LoanRepaid");

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.gte(
        BigNumber.from(reserveBalance)
      );
    });

    it("Pause Loan:", async () => {

      const adminLoan = utils.formatBytes32String("adminLoan");
      await loan.pauseLoan();
      expect(await loan.isPausedLoan()).to.equal(true);

      await loan.unpauseLoan();
      expect(await loan.isPausedLoan()).to.equal(false);

      await expect(loan.connect(accounts[1]).pauseLoan()).to.be
        .reverted;

      await expect(
        accessRegistry.addAdminRole(adminLoan, accounts[1].address)
      ).emit(accessRegistry, "AdminRoleDataGranted");

      await expect(
        accessRegistry.addAdminRole(adminLoan, accounts[1].address)
      ).to.be.reverted;

      await loan.connect(accounts[1]).pauseLoan();
      expect(await loan.isPausedLoan()).to.equal(true);

      await expect(
        accessRegistry.removeAdminRole(adminLoan, accounts[1].address)
      ).emit(accessRegistry, "AdminRoleDataRevoked");

      await expect(loan.connect(accounts[1]).unpauseLoan()).to.be
        .reverted;
      expect(await loan.isPausedLoan()).to.equal(true);

      await loan.unpauseLoan();
      expect(await loan.isPausedLoan()).to.equal(false);
    });

    it("Pause LoanExt", async () => {

      expect(await loanExt.utilisedReservesLoan(symbolBtc)).to.not.equal(BigNumber.from(0));

      const adminLoanExt = utils.formatBytes32String("adminLoanExt");
      await loanExt.pauseLoanExt();
      expect(await loanExt.isPausedLoanExt()).to.equal(true);

      await loanExt.unpauseLoanExt();
      expect(await loanExt.isPausedLoanExt()).to.equal(false);

      await expect(loanExt.connect(accounts[1]).pauseLoanExt()).to.be
        .reverted;

      await expect(
        accessRegistry.addAdminRole(adminLoanExt, accounts[1].address)
      ).emit(accessRegistry, "AdminRoleDataGranted");

      await expect(
        accessRegistry.addAdminRole(adminLoanExt, accounts[1].address)
      ).to.be.reverted;

      await loanExt.connect(accounts[1]).pauseLoanExt();
      expect(await loanExt.isPausedLoanExt()).to.equal(true);

      await expect(
        accessRegistry.removeAdminRole(adminLoanExt, accounts[1].address)
      ).emit(accessRegistry, "AdminRoleDataRevoked");

      await expect(loanExt.connect(accounts[1]).unpauseLoanExt()).to.be
        .reverted;
      expect(await loanExt.isPausedLoanExt()).to.equal(true);

      await loanExt.unpauseLoanExt();
      expect(await loanExt.isPausedLoanExt()).to.equal(false);
    });

    it("Pause LoanExtv1:", async () => {
      const adminLoanExtv1 = utils.formatBytes32String("adminLoanExtv1");

      await loanExtv1.pauseLoanExtv1();
      expect(await loanExtv1.isPausedLoanExtv1()).to.equal(true);

      await loanExtv1.unpauseLoanExtv1();
      expect(await loanExtv1.isPausedLoanExtv1()).to.equal(false);

      await expect(loanExtv1.connect(accounts[1]).pauseLoanExtv1()).to.be
        .reverted;

      await expect(
        accessRegistry.addAdminRole(adminLoanExtv1, accounts[1].address)
      ).emit(accessRegistry, "AdminRoleDataGranted");

      await expect(
        accessRegistry.addAdminRole(adminLoanExtv1, accounts[1].address)
      ).to.be.reverted;

      await loanExtv1.connect(accounts[1]).pauseLoanExtv1();
      expect(await loanExtv1.isPausedLoanExtv1()).to.equal(true);

      await expect(
        accessRegistry.removeAdminRole(adminLoanExtv1, accounts[1].address)
      ).emit(accessRegistry, "AdminRoleDataRevoked");

      await expect(loanExtv1.connect(accounts[1]).unpauseLoanExtv1()).to.be
        .reverted;
      expect(await loanExtv1.isPausedLoanExtv1()).to.equal(true);

      await loanExtv1.unpauseLoanExtv1();
      expect(await loanExtv1.isPausedLoanExtv1()).to.equal(false);
    });
  });

  describe("USDT Test: Loan", async () => {
    const symbolWbnb =
      "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt =
      "0x555344542e740000000000000000000000000000000000000000000000000000"; // Usdt.t
    const symbolUsdc =
      "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc =
      "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t
    const symbolSxp =
      "0x5358500000000000000000000000000000000000000000000000000000000000"; // SXP
    const symbolCAKE =
      "0x43414b4500000000000000000000000000000000000000000000000000000000"; // CAKE
    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
    const comit_NONE = utils.formatBytes32String("comit_NONE");

    before(async () => {
      // deploying relevant contracts
      library = await ethers.getContractAt("LibOpen", diamondAddress);
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      loan = await ethers.getContractAt("Loan", diamondAddress);
      loanExt = await ethers.getContractAt("LoanExt", diamondAddress);
      loanExtv1 = await ethers.getContractAt("LoanExtv1", diamondAddress);

      // deploying tokens
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tWBNBAddress"]);
      bepCake = await ethers.getContractAt("BEP20Token", rets["tCakeAddress"]);
      bepSxp = await ethers.getContractAt("BEP20Token", rets["tSxpAddress"]);
    });


    it("Check Liquidation", async () => {

      const loanAmount = 30000000000;
      const collateralAmount = 20000000000;

      const reserveBalance = BigNumber.from(
        await bepUsdc.balanceOf(diamondAddress)
      );
      await bepUsdc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loanExt
          .connect(accounts[1])
          .loanRequest(
            symbolUsdc,
            comit_ONEMONTH,
            loanAmount,
            symbolUsdc,
            collateralAmount
          )
      ).emit(loanExt, "NewLoan");

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.equal(
        reserveBalance.add(BigNumber.from(collateralAmount))
      );

      await expect(loanExtv1.connect(accounts[0]).liquidation(accounts[1].address, symbolUsdc, comit_ONEMONTH)).emit(loanExtv1, "Liquidation");

      await bepUsdc
        .connect(accounts[1])
        .approve(diamondAddress, collateralAmount);
      await expect(
        loan
          .connect(accounts[1])
          .addCollateral(symbolUsdc, comit_NONE, collateralAmount)
      ).to.be.reverted;

      await expect(
        loan.connect(accounts[1]).swapLoan(symbolUsdc, comit_NONE, symbolCAKE)
      ).to.be.reverted;
    });
  })
});
