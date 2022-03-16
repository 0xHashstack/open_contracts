const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { deployDiamond } = require("../scripts/deploy_all.js");
const { addMarkets } = require("../scripts/deploy_all.js");

let diamondAddress;
let rets;
let accounts = await ethers.getSigners();

diamondAddress = await deployDiamond();
rets = await addMarkets(diamondAddress);


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

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);
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

  it("USDT New Loan", async () => {
    const loanAmount = 30000000000;
    const collateralAmount = 20000000000;

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);
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
        .emit(loanExt, "NewLoan")
    );

    expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance + collateralAmount)
    );
  });

  it("USDT New Loan (Retry)", async () => {
    const loanAmount = 30000000000;
    const collateralAmount = 20000000000;

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);
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

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);
    await bepUsdt
      .connect(accounts[1])
      .approve(diamondAddress, collateralAmount);
    await expect(
      loan
        .connect(accounts[1])
        .addCollateral(symbolUsdt, comit_NONE, collateralAmount)
        .emit(loanExt, "AddCollateral")
    );

    expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance + collateralAmount)
    );
  });

  it("USDT Withdraw Loan (Trying more than permissible)", async () => {
    const withdrawAmount = 35000000000;
    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await expect(
      loan
        .connect(accounts[1])
        .withdrawpartialLoan(symbolUsdt, comit_NONE, withdrawAmount)
    ).to.be.reverted;

    expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance)
    );
  });

  it("Swap Loan", async () => {
    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);
    await expect(
      loan
        .connect(accounts[1])
        .swapLoan(symbolUsdt, comit_NONE, symbolCAKE)
        .emit(loan, "MarketSwapped")
    );

    expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.lt(
      BigNumber.from(reserveBalance)
    );
  });

  it("Swap to Loan", async () => {
    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);
    await expect(
      loan
        .connect(accounts[1])
        .swapToLoan(symbolUsdt, comit_NONE)
        .emit(loan, "MarketSwapped")
    );

    expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.gt(
      BigNumber.from(reserveBalance)
    );
  });

  it("USDT Withdraw Loan", async () => {
    const withdrawAmount = 25000000000;
    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await expect(
      loan
        .connect(accounts[1])
        .withdrawpartialLoan(symbolUsdt, comit_NONE, withdrawAmount)
        .emit(loan, "WithdrawPartialLoan")
    );

    expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance - withdrawAmount)
    );
  });

  it("Repay Loan", async () => {
    const repayAmount = 50000000000;
    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await bepUsdt
      .connect(accounts[1])
      .approve(diamondAddress, collateralAmount);
    await expect(
      loanExt
        .connect(accounts[1])
        .repayLoan(symbolUsdt, comit_NONE, repayAmount)
        .emit(loanExt, "LoanRepaid")
    );

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

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);
    await bepBtc.connect(accounts[1]).approve(diamondAddress, collateralAmount);
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
    const loanAmount = 15000000; // 0.15 Btc
    const collateralAmount = 20000000; // 0.2 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);
    await bepBtc.connect(accounts[1]).approve(diamondAddress, collateralAmount);
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
        .emit(loanExt, "NewLoan")
    );

    expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance + collateralAmount)
    );
  });

  it("Btc New Loan (Retry)", async () => {
    const loanAmount = 300000000;
    const collateralAmount = 200000000;

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);
    await bepBtc.connect(accounts[1]).approve(diamondAddress, collateralAmount);
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

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);
    await bepBtc.connect(accounts[1]).approve(diamondAddress, collateralAmount);
    await expect(
      loan
        .connect(accounts[1])
        .addCollateral(symbolBtc, comit_ONEMONTH, collateralAmount)
        .emit(loanExt, "AddCollateral")
    );

    expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance + collateralAmount)
    );
  });

  it("Swap Loan", async () => {
    const reserveBalance = await bepBtc.balanceOf(diamondAddress);
    const reserveBal = await bepSxp.balanceOf(diamondAddress);
    await expect(
      loan
        .connect(accounts[1])
        .swapLoan(symbolBtc, comit_ONEMONTH, symbolSxp)
        .emit(loan, "MarketSwapped")
    );

    expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.lt(
      BigNumber.from(reserveBalance)
    );
    expect(BigNumber.from(await bepSxp.balanceOf(diamondAddress))).to.gt(
      BigNumber.from(reserveBal)
    );
  });

  it("Swap Loan (2nd Attempt)", async () => {
    const reserveBalance = await bepBtc.balanceOf(diamondAddress);
    const reserveBal = await bepSxp.balanceOf(diamondAddress);
    await expect(
      loan
        .connect(accounts[1])
        .swapLoan(symbolBtc, comit_ONEMONTH, symbolSxp)
    ).to.be.reverted;

    expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance)
    );
    expect(BigNumber.from(await bepSxp.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBal)
    );
  });

  it("Swap to Loan", async () => {
    const reserveBalance = await bepBtc.balanceOf(diamondAddress);
    const reserveBal = await bepSxp.balanceOf(diamondAddress);
    await expect(
      loan
        .connect(accounts[1])
        .swapToLoan(symbolBtc, comit_ONEMONTH)
        .emit(loan, "MarketSwapped")
    );

    expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.gt(
      BigNumber.from(reserveBalance)
    );
    expect(BigNumber.from(await bepSxp.balanceOf(diamondAddress))).to.lt(
      BigNumber.from(reserveBal)
    );
  });

  it("Swap to Loan (2nd Attempt)", async () => {
    const reserveBalance = await bepBtc.balanceOf(diamondAddress);
    const reserveBal = await bepSxp.balanceOf(diamondAddress);
    await expect(
      loan
        .connect(accounts[1])
        .swapToLoan(symbolBtc, comit_ONEMONTH)
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
    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await expect(
      loan
        .connect(accounts[1])
        .withdrawpartialLoan(symbolBtc, comit_ONEMONTH, withdrawAmount)
        .emit(loan, "WithdrawPartialLoan")
    );

    expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance - withdrawAmount)
    );
  });

  it("Repay Loan", async () => {
    const repayAmount = 50000000; // 0.5 BTC
    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await bepBtc.connect(accounts[1]).approve(diamondAddress, collateralAmount);
    await expect(
      loanExt
        .connect(accounts[1])
        .repayLoan(symbolBtc, comit_ONEMONTH, repayAmount)
        .emit(loanExt, "LoanRepaid")
    );

    expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.lt(
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

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);
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

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);
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
        .emit(loanExt, "NewLoan")
    );

    expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance + collateralAmount)
    );
  });

  it("Usdc New Loan (Retry)", async () => {
    const loanAmount = 30000000000;
    const collateralAmount = 20000000000;

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);
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

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);
    await bepUsdc.connect(accounts[1]).approve(diamondAddress, collateralAmount);
    await expect(
      loan
        .connect(accounts[1])
        .addCollateral(symbolUsdc, comit_NONE, collateralAmount)
    ).to.be.reverted;

    expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance)
    );
  });

  it("Usdc Add Collateral", async () => {
    const collateralAmount = 15000000; // 0.15 BTC 

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);
    await bepBtc
      .connect(accounts[1])
      .approve(diamondAddress, collateralAmount);
    await expect(
      loan
        .connect(accounts[1])
        .addCollateral(symbolBtc, comit_NONE, collateralAmount)
        .emit(loanExt, "AddCollateral")
    );

    expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance + collateralAmount)
    );
  });

  it("Swap Loan", async () => {
    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);
    await expect(
      loan
        .connect(accounts[1])
        .swapLoan(symbolUsdc, comit_NONE, symbolCAKE)
        .emit(loan, "MarketSwapped")
    );

    expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.lt(
      BigNumber.from(reserveBalance)
    );
  });

  it("Swap to Loan", async () => {
    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);
    await expect(
      loan
        .connect(accounts[1])
        .swapToLoan(symbolUsdc, comit_NONE)
        .emit(loan, "MarketSwapped")
    );

    expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.gt(
      BigNumber.from(reserveBalance)
    );
  });

  it("Usdc Withdraw Loan", async () => {
    const withdrawAmount = 250000000000;
    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await expect(
      loan
        .connect(accounts[1])
        .withdrawpartialLoan(symbolUsdc, comit_NONE, withdrawAmount)
        .emit(loan, "WithdrawPartialLoan")
    );

    expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance - withdrawAmount)
    );
  });

  it("Repay Loan", async () => {
    const repayAmount = 50000000000;
    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await bepUsdc
      .connect(accounts[1])
      .approve(diamondAddress, collateralAmount);
    await expect(
      loanExt
        .connect(accounts[1])
        .repayLoan(symbolUsdc, comit_NONE, repayAmount)
        .emit(loanExt, "LoanRepaid")
    );

    expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress))).to.lt(
      BigNumber.from(reserveBalance)
    );
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

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);
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

  it("Wbnb New Loan (Cross Market)", async () => {
    const loanAmount = 30000000; // 0.3 Wbnb
    const collateralAmount = 20000000; // 0.2 Wbnb

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);
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
        .emit(loanExt, "NewLoan")
    );

    expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance + collateralAmount)
    );
  });

  it("Wbnb New Loan (Retry)", async () => {
    const loanAmount = 300000000;
    const collateralAmount = 200000000;

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);
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

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);
    await bepWbnb
      .connect(accounts[1])
      .approve(diamondAddress, collateralAmount);
    await expect(
      loan
        .connect(accounts[1])
        .addCollateral(symbolWbnb, comit_ONEMONTH, collateralAmount)
        .emit(loanExt, "AddCollateral")
    );

    expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance + collateralAmount)
    );
  });

  it("Swap Loan", async () => {
    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);
    const reserveBal = await bepSxp.balanceOf(diamondAddress);
    await expect(
      loan
        .connect(accounts[1])
        .swapLoan(symbolWbnb, comit_ONEMONTH, symbolSxp)
        .emit(loan, "MarketSwapped")
    );

    expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.lt(
      BigNumber.from(reserveBalance)
    );
    expect(BigNumber.from(await bepSxp.balanceOf(diamondAddress))).to.gt(
      BigNumber.from(reserveBal)
    );
  });

  it("Swap to Loan", async () => {
    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);
    const reserveBal = await bepSxp.balanceOf(diamondAddress);
    await expect(
      loan
        .connect(accounts[1])
        .swapToLoan(symbolWbnb, comit_ONEMONTH)
        .emit(loan, "MarketSwapped")
    );

    expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.gt(
      BigNumber.from(reserveBalance)
    );
    expect(BigNumber.from(await bepSxp.balanceOf(diamondAddress))).to.lt(
      BigNumber.from(reserveBal)
    );
  });

  it("Wbnb Withdraw Loan", async () => {
    const withdrawAmount = 15000000;
    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await expect(
      loan
        .connect(accounts[1])
        .withdrawpartialLoan(symbolWbnb, comit_ONEMONTH, withdrawAmount)
        .emit(loan, "WithdrawPartialLoan")
    );

    expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.equal(
      BigNumber.from(reserveBalance - withdrawAmount)
    );
  });

  it("Repay Loan", async () => {
    const repayAmount = 50000000; // 0.5 Wbnb
    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await bepWbnb
      .connect(accounts[1])
      .approve(diamondAddress, collateralAmount);
    await expect(
      loanExt
        .connect(accounts[1])
        .repayLoan(symbolWbnb, comit_ONEMONTH, repayAmount)
        .emit(loanExt, "LoanRepaid")
    );

    expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress))).to.lt(
      BigNumber.from(reserveBalance)
    );
  });
});

