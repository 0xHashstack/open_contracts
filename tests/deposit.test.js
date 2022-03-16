const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

const { deployDiamond } = require("../scripts/deploy_all.js");
const { addMarkets } = require("../scripts/deploy_all.js");

let diamondAddress;
let rets;

diamondAddress = await deployDiamond();
rets = await addMarkets(diamondAddress);

describe("Test: Deposit (Commit None)", async () => {

  const symbolWBNB =
    "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
  const symbolUsdt =
    "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
  const symbolUsdc =
    "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
  const symbolBtc =
    "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t

  const comit_NONE = utils.formatBytes32String("comit_NONE");

  before(async () => {
    // fetching accounts
    accounts = await ethers.getSigners();

    // deploying relevant contracts
    library = await ethers.getContractAt("LibOpen", diamondAddress);
    tokenList = await ethers.getContractAt("TokenList", diamondAddress);
    deposit = await ethers.getContractAt("Deposit", diamondAddress);

    // deploying tokens
    bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
    bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
    bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
    bepWbnb = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
        
  });

  // USDT Deposits
  it("USDT New Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdt, comit_NONE, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDT Add to Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdt, comit_NONE, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDT Minimum Deposit", async () => {
    const depositAmount = 500000000; // 50 (8-0's) 50 UDST

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdt, comit_NONE, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw USDT", async () => {
    const withdrawAmount = 50000000000; // 500 8-0's 500 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdt, comit_NONE, withdrawAmount)
    ).emit(deposit, "DepositWithdrawal");

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance - withdrawAmount));
  });

  it("Withdraw USDT(more than deposited)", async () => {
    const withdrawAmount = 60000000000; // 600 8-0's 600 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdt, comit_NONE, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });  

  // USDC Deposits
  it("USDC New Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdc, comit_NONE, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDC Add to Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdc, comit_NONE, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDC Minimum Deposit", async () => {
    const depositAmount = 500000000; // 50 (8-0's) 50 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdc, comit_NONE, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw USDC", async () => {
    const withdrawAmount = 50000000000; // 500 8-0's 500 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdc, comit_NONE, withdrawAmount)
    ).emit(deposit, "DepositWithdrawal");

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance - withdrawAmount));
  });

  it("Withdraw USDC(more than deposited)", async () => {
    const withdrawAmount = 60000000000; // 600 8-0's 600 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdc, comit_NONE, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });  

  // BTC Deposits
  it("BTC New Deposit", async () => {
    const depositAmount = 20000000; // 2 (7-0's)  0.2 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_NONE, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BTC Add to Deposit", async () => {
    const depositAmount = 15000000; // 15 (6-0's) 0.15 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_NONE, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BTC Minimum Deposit", async () => {
    const depositAmount = 5000000; // 5 (6-0's) 0.05 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_NONE, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw BTC", async () => {
    const withdrawAmount = 20000000; // 2 (7-0's)  0.2 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolBtc, comit_NONE, withdrawAmount)
    ).emit(deposit, "DepositWithdrawal");

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance - withdrawAmount));
  });

  it("Withdraw BTC(more than deposited)", async () => {
    const withdrawAmount = 20000000; // 2 (7-0's)  0.2 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolBtc, comit_NONE, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });  
  

  // BNB Deposits
  it("BNB New Deposit", async () => {
    const depositAmount = 30000000; // 3 (7-0's)  0.3 BNB

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolWBNB, comit_NONE, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BNB Add to Deposit", async () => {
    const depositAmount = 28000000; // 28 (6-0's) 0.28 BTC

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_NONE, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BTC Minimum Deposit", async () => {
    const depositAmount = 5000000; // 5 (6-0's) 0.05 BNB

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolWBNB, comit_NONE, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw BNB", async () => {
    const withdrawAmount = 30000000; // 3 (7-0's)  0.3 BNB

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolWBNB, comit_NONE, withdrawAmount)
    ).emit(deposit, "DepositWithdrawal");

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance - withdrawAmount));
  });

  it("Withdraw BTC(more than deposited)", async () => {
    const withdrawAmount = 30000000; // 3 (7-0's)  0.3 BNB

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolBtc, comit_NONE, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });  

})


describe("Test: Deposit (Commit Two Weeks)", async () => {

  const symbolWBNB =
    "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
  const symbolUsdt =
    "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
  const symbolUsdc =
    "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
  const symbolBtc =
    "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t

  const comit_TWOWEEKS = utils.formatBytes32String("comit_TWOWEEKS");

  before(async () => {
    // fetching accounts
    accounts = await ethers.getSigners();

    // deploying relevant contracts
    library = await ethers.getContractAt("LibOpen", diamondAddress);
    tokenList = await ethers.getContractAt("TokenList", diamondAddress);
    deposit = await ethers.getContractAt("Deposit", diamondAddress);

    // deploying tokens
    bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
    bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
    bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
    bepWbnb = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
        
  });

  // USDT Deposits
  it("USDT New Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdt, comit_TWOWEEKS, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDT Add to Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdt, comit_TWOWEEKS, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDT Minimum Deposit", async () => {
    const depositAmount = 500000000; // 50 (8-0's) 50 UDST

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdt, comit_TWOWEEKS, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw USDT", async () => {
    const withdrawAmount = 50000000000; // 500 8-0's 500 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdt, comit_TWOWEEKS, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw USDT(more than deposited)", async () => {
    const withdrawAmount = 60000000000; // 600 8-0's 600 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdt, comit_TWOWEEKS, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  // USDC Deposits
  it("USDC New Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdc, comit_TWOWEEKS, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDC Add to Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdc, comit_TWOWEEKS, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDC Minimum Deposit", async () => {
    const depositAmount = 500000000; // 50 (8-0's) 50 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdc, comit_TWOWEEKS, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw USDC", async () => {
    const withdrawAmount = 50000000000; // 500 8-0's 500 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdc, comit_TWOWEEKS, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance - withdrawAmount));
  });

  it("Withdraw USDC(more than deposited)", async () => {
    const withdrawAmount = 60000000000; // 600 8-0's 600 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdc, comit_TWOWEEKS, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  // BTC Deposits
  it("BTC New Deposit", async () => {
    const depositAmount = 20000000; // 2 (7-0's)  0.2 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_TWOWEEKS, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BTC Add to Deposit", async () => {
    const depositAmount = 15000000; // 15 (6-0's) 0.15 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_TWOWEEKS, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BTC Minimum Deposit", async () => {
    const depositAmount = 5000000; // 5 (6-0's) 0.05 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_TWOWEEKS, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw BTC", async () => {
    const withdrawAmount = 20000000; // 2 (7-0's)  0.2 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolBtc, comit_TWOWEEKS, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance - withdrawAmount));
  });

  it("Withdraw BTC(more than deposited)", async () => {
    const withdrawAmount = 20000000; // 2 (7-0's)  0.2 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolBtc, comit_TWOWEEKS, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  // BNB Deposits
  it("BNB New Deposit", async () => {
    const depositAmount = 30000000; // 3 (7-0's)  0.3 BNB

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolWBNB, comit_TWOWEEKS, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BNB Add to Deposit", async () => {
    const depositAmount = 28000000; // 28 (6-0's) 0.28 BTC

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_TWOWEEKS, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BTC Minimum Deposit", async () => {
    const depositAmount = 5000000; // 5 (6-0's) 0.05 BNB

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolWBNB, comit_TWOWEEKS, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw BNB", async () => {
    const withdrawAmount = 30000000; // 3 (7-0's)  0.3 BNB

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolWBNB, comit_TWOWEEKS, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw BTC(more than deposited)", async () => {
    const withdrawAmount = 30000000; // 3 (7-0's)  0.3 BNB

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolBtc, comit_TWOWEEKS, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });
});

describe("Test: Deposit (Commit One Month)", async () => {
  let diamondAddress = "0x0";

  const symbolWBNB =
    "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
  const symbolUsdt =
    "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
  const symbolUsdc =
    "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
  const symbolBtc =
    "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t

  const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");
  const comit_THREEMONTHS = utils.formatBytes32String("comit_THREEMONTHS");

  before(async () => {
    // fetching accounts
    accounts = await ethers.getSigners();

    // deploying relevant contracts
    library = await ethers.getContractAt("LibOpen", diamondAddress);
    tokenList = await ethers.getContractAt("TokenList", diamondAddress);
    deposit = await ethers.getContractAt("Deposit", diamondAddress);

    // deploying tokens
    bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
    bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
    bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
    bepWbnb = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
  });

  // USDT Deposits
  it("USDT New Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdt, comit_ONEMONTH, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDT Add to Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdt, comit_ONEMONTH, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDT Minimum Deposit", async () => {
    const depositAmount = 500000000; // 50 (8-0's) 50 UDST

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdt, comit_ONEMONTH, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw USDT", async () => {
    const withdrawAmount = 50000000000; // 500 8-0's 500 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdt, comit_ONEMONTH, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw USDT(more than deposited)", async () => {
    const withdrawAmount = 60000000000; // 600 8-0's 600 USDT

    const reserveBalance = await bepUsdt.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdt, comit_ONEMONTH, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdt.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  // USDC Deposits
  it("USDC New Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdc, comit_ONEMONTH, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDC Add to Deposit", async () => {
    const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdc, comit_ONEMONTH, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("USDC Minimum Deposit", async () => {
    const depositAmount = 500000000; // 50 (8-0's) 50 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolUsdc, comit_ONEMONTH, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw USDC", async () => {
    const withdrawAmount = 50000000000; // 500 8-0's 500 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdc, comit_ONEMONTH, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw USDC(more than deposited)", async () => {
    const withdrawAmount = 60000000000; // 600 8-0's 600 USDC

    const reserveBalance = await bepUsdc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolUsdc, comit_ONEMONTH, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepUsdc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  // BTC Deposits
  it("BTC New Deposit", async () => {
    const depositAmount = 20000000; // 2 (7-0's)  0.2 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_ONEMONTH, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BTC Add to Deposit", async () => {
    const depositAmount = 15000000; // 15 (6-0's) 0.15 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_ONEMONTH, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BTC Minimum Deposit", async () => {
    const depositAmount = 5000000; // 5 (6-0's) 0.05 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_ONEMONTH, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw BTC", async () => {
    const withdrawAmount = 20000000; // 2 (7-0's)  0.2 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolBtc, comit_ONEMONTH, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw BTC(more than deposited)", async () => {
    const withdrawAmount = 20000000; // 2 (7-0's)  0.2 BTC

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolBtc, comit_ONEMONTH, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  // BNB Deposits
  it("BNB New Deposit", async () => {
    const depositAmount = 30000000; // 3 (7-0's)  0.3 BNB

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolWBNB, comit_ONEMONTH, depositAmount)
    ).emit(deposit, "NewDeposit");

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BNB Add to Deposit", async () => {
    const depositAmount = 28000000; // 28 (6-0's) 0.28 BTC

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolBtc, comit_ONEMONTH, depositAmount)
    ).emit(deposit, "DepositAdded");

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance + depositAmount));
  });

  it("BTC Minimum Deposit", async () => {
    const depositAmount = 5000000; // 5 (6-0's) 0.05 BNB

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

    await expect(
      deposit
        .connect(accounts[1])
        .depositRequest(symbolWBNB, comit_ONEMONTH, depositAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw BNB", async () => {
    const withdrawAmount = 30000000; // 3 (7-0's)  0.3 BNB

    const reserveBalance = await bepWbnb.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolWBNB, comit_ONEMONTH, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepWbnb.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });

  it("Withdraw BTC(more than deposited)", async () => {
    const withdrawAmount = 30000000; // 3 (7-0's)  0.3 BNB

    const reserveBalance = await bepBtc.balanceOf(diamondAddress);

    await expect(
      deposit
        .connect(accounts[1])
        .withdrawDeposit(symbolBtc, comit_ONEMONTH, withdrawAmount)
    ).to.be.reverted;

    expect(
      BigNumber.from(await bepBtc.balanceOf(diamondAddress)),
      "Reserve Balance unequal"
    ).to.equal(BigNumber.from(reserveBalance));
  });
});