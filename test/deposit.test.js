const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, waffle } = require("hardhat");
const utils = require("ethers").utils;

const { deployDiamond, provideLiquidity } = require("../scripts/deploy_all.js");
const { addMarkets } = require("../scripts/deploy_all.js");
const TOKENS_DECIMAL = 8;

let diamondAddress;
let rets;
let tokenList;
let library;
let deposit;
let faucet;
let accessRegistry;
let accounts;

let bepBtc;
let bepUsdc;
let bepUsdt;
let bepWbnb;

describe("Testing Deposit", async () => {
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

  describe("Test: Deposit (Commit None)", async () => {
    const symbolWBNB = "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt = "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
    const symbolUsdc = "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc = "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t

    const comit_NONE = utils.formatBytes32String("comit_NONE");

    before(async () => {
      // deploying relevant contracts
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      deposit = await ethers.getContractAt("Deposit", diamondAddress);
      accessRegistry = await ethers.getContractAt("AccessRegistry", rets["accessRegistryAddress"]);
      // deploying tokens
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tWBNBAddress"]);
    });

    it("Pause Deposit:", async () => {
      const adminDeposit = utils.formatBytes32String("adminDeposit");
      await deposit.pauseDeposit();
      expect(await deposit.isPausedDeposit()).to.equal(true);

      await deposit.unpauseDeposit();
      expect(await deposit.isPausedDeposit()).to.equal(false);

      await expect(deposit.connect(accounts[1]).pauseDeposit()).to.be.reverted;

      await expect(accessRegistry.addAdminRole(adminDeposit, accounts[1].address)).emit(
        accessRegistry,
        "AdminRoleDataGranted",
      );

      await expect(accessRegistry.addAdminRole(adminDeposit, accounts[1].address)).to.be.reverted;

      await deposit.connect(accounts[1]).pauseDeposit();
      expect(await deposit.isPausedDeposit()).to.equal(true);

      await expect(accessRegistry.removeAdminRole(adminDeposit, accounts[1].address)).emit(
        accessRegistry,
        "AdminRoleDataRevoked",
      );

      await expect(deposit.connect(accounts[1]).unpauseDeposit()).to.be.reverted;
      expect(await deposit.isPausedDeposit()).to.equal(true);

      await deposit.unpauseDeposit();
      expect(await deposit.isPausedDeposit()).to.equal(false);
    });

    // USDT Deposits
    it("USDT New Deposit", async () => {
      const depositAmount = ethers.utils.parseUnits("500", TOKENS_DECIMAL); // 500 (8-0's) 500 USDT

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdt, comit_NONE, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDT Add to Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

      const deposits = await deposit.getDeposits(accounts[1].address);

      expect(await deposit.hasAccount(accounts[1].address)).to.equal(true);

      expect(deposits).to.not.equal(null);

      expect(await deposit.connect(accounts[1]).hasYield(symbolUsdt, comit_NONE)).to.equal(true);

      expect(await deposit.connect(accounts[1]).hasDeposit(symbolUsdt, comit_NONE)).to.equal(true);

      expect(BigNumber.from(await deposit.getDepositInterest(accounts[1].address, 1)));

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdt, comit_NONE, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDT Minimum Deposit", async () => {
      const depositAmount = 500000000; // 50 (8-0's) 50 UDST

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdt, comit_NONE, depositAmount)).to.be.reverted;

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    it("Withdraw USDT", async () => {
      const withdrawAmount = 50000000000; // 500 8-0's 500 USDT

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdt, comit_NONE, withdrawAmount)).emit(
        deposit,
        "DepositWithdrawal",
      );

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.sub(BigNumber.from(withdrawAmount)),
      );
    });

    it("Withdraw USDT(more than deposited)", async () => {
      const withdrawAmount = 60000000000; // 600 8-0's 600 USDT

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdt, comit_NONE, withdrawAmount)).to.be.reverted;

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    it("USDT Get Interests", async () => {
      const currentProvider = waffle.provider;
      await currentProvider.send("evm_increaseTime", [86400]);
      await currentProvider.send("evm_mine");
      expect(BigNumber.from(await deposit.getDepositInterest(accounts[1].address, 1))).to.gt(BigNumber.from(0));
    });

    // USDC Deposits
    it("USDC New Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdc, comit_NONE, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDC Add to Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdc, comit_NONE, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDC Minimum Deposit", async () => {
      const depositAmount = 500000000; // 50 (8-0's) 50 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdc, comit_NONE, depositAmount)).to.be.reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    it("Withdraw USDC", async () => {
      const withdrawAmount = 50000000000; // 500 8-0's 500 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdc, comit_NONE, withdrawAmount)).emit(
        deposit,
        "DepositWithdrawal",
      );

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.sub(BigNumber.from(withdrawAmount)),
      );
    });

    it("Withdraw USDC(more than deposited)", async () => {
      const withdrawAmount = 60000000000; // 600 8-0's 600 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdc, comit_NONE, withdrawAmount)).to.be.reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // BTC Deposits
    it("BTC New Deposit", async () => {
      const depositAmount = 20000000; // 2 (7-0's)  0.2 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolBtc, comit_NONE, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BTC Add to Deposit", async () => {
      const depositAmount = 15000000; // 15 (6-0's) 0.15 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolBtc, comit_NONE, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BTC Minimum Deposit", async () => {
      const depositAmount = 5000000; // 5 (6-0's) 0.05 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolBtc, comit_NONE, depositAmount)).to.be.reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    it("Withdraw BTC", async () => {
      const withdrawAmount = 20000000; // 2 (7-0's)  0.2 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolBtc, comit_NONE, withdrawAmount)).emit(
        deposit,
        "DepositWithdrawal",
      );

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.sub(BigNumber.from(withdrawAmount)),
      );
    });

    it("Withdraw BTC(more than deposited)", async () => {
      const withdrawAmount = 20000000; // 2 (7-0's)  0.2 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolBtc, comit_NONE, withdrawAmount)).to.be.reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // BNB Deposits
    it("BNB New Deposit", async () => {
      const depositAmount = 30000000; // 3 (7-0's)  0.3 BNB

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolWBNB, comit_NONE, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BNB Add to Deposit", async () => {
      const depositAmount = 28000000; // 28 (6-0's) 0.28 BNB

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolWBNB, comit_NONE, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BNB Minimum Deposit", async () => {
      const depositAmount = 5000000; // 5 (6-0's) 0.05 BNB

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolWBNB, comit_NONE, depositAmount)).to.be.reverted;

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    it("Withdraw BNB", async () => {
      const withdrawAmount = 30000000; // 3 (7-0's)  0.3 BNB

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolWBNB, comit_NONE, withdrawAmount)).emit(
        deposit,
        "DepositWithdrawal",
      );

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.sub(BigNumber.from(withdrawAmount)),
      );
    });

    it("Withdraw BNB(more than deposited)", async () => {
      const withdrawAmount = 30000000; // 3 (7-0's)  0.3 BNB

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolBtc, comit_NONE, withdrawAmount)).to.be.reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });
  });

  describe("Test: Deposit (Commit Two Weeks)", async () => {
    const symbolWBNB = "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt = "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
    const symbolUsdc = "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc = "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t

    const comit_TWOWEEKS = utils.formatBytes32String("comit_TWOWEEKS");

    before(async () => {
      // fetching accounts

      // deploying relevant contracts
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      deposit = await ethers.getContractAt("Deposit", diamondAddress);

      // deploying tokens
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tWBNBAddress"]);
    });

    // USDT Deposits
    it("USDT New Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdt, comit_TWOWEEKS, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDT Add to Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdt, comit_TWOWEEKS, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDT Minimum Deposit", async () => {
      const depositAmount = 500000000; // 50 (8-0's) 50 UDST

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdt, comit_TWOWEEKS, depositAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    it("Withdraw USDT", async () => {
      const withdrawAmount = 50000000000; // 500 8-0's 500 USDT
      const currentProvider = waffle.provider;

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await deposit.connect(accounts[1]).withdrawDeposit(symbolUsdt, comit_TWOWEEKS, withdrawAmount);

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance,
      );

      console.log("Pre-Time: ", (await currentProvider.getBlock()).timestamp);

      const timeInSeconds = 2 * 7 * 24 * 60 * 60 + 20;
      await currentProvider.send("evm_increaseTime", [timeInSeconds]);
      await currentProvider.send("evm_mine");
      console.log("Post-Time: ", (await currentProvider.getBlock()).timestamp);
      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdt, comit_TWOWEEKS, withdrawAmount)).emit(
        deposit,
        "DepositWithdrawal",
      );

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.lte(
        reserveBalance.sub(BigNumber.from(withdrawAmount)),
      );
    });

    it("Withdraw USDT(more than deposited)", async () => {
      const withdrawAmount = 600000000000; // 6000 8-0's 600 USDT

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdt, comit_TWOWEEKS, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // USDC Deposits
    it("USDC New Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdc, comit_TWOWEEKS, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDC Add to Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdc, comit_TWOWEEKS, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDC Minimum Deposit", async () => {
      const depositAmount = 500000000; // 50 (8-0's) 50 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdc, comit_TWOWEEKS, depositAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // skipped because timelock for commitment yet to be implemented
    it.skip("Withdraw USDC", async () => {
      const withdrawAmount = 50000000000; // 500 8-0's 500 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdc, comit_TWOWEEKS, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance,
      );
    });

    it("Withdraw USDC(more than deposited)", async () => {
      const withdrawAmount = 600000000000; // 6000 8-0's 600 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdc, comit_TWOWEEKS, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // BTC Deposits
    it("BTC New Deposit", async () => {
      const depositAmount = 20000000; // 2 (7-0's)  0.2 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolBtc, comit_TWOWEEKS, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BTC Add to Deposit", async () => {
      const depositAmount = 15000000; // 15 (6-0's) 0.15 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolBtc, comit_TWOWEEKS, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BTC Minimum Deposit", async () => {
      const depositAmount = 5000000; // 5 (6-0's) 0.05 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolBtc, comit_TWOWEEKS, depositAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // skipped because timelock for commitment yet to be implemented
    it.skip("Withdraw BTC", async () => {
      const withdrawAmount = 20000000; // 2 (7-0's)  0.2 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolBtc, comit_TWOWEEKS, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance,
      );
    });

    it("Withdraw BTC(more than deposited)", async () => {
      const withdrawAmount = 200000000; // 2 (8-0's)  2 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolBtc, comit_TWOWEEKS, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // BNB Deposits
    it("BNB New Deposit", async () => {
      const depositAmount = 30000000; // 3 (7-0's)  0.3

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

      console.log("Token BNB: ", bepWbnb.address);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolWBNB, comit_TWOWEEKS, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BNB Add to Deposit", async () => {
      const depositAmount = 28000000; // 28 (6-0's)  0.28 BNB

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolWBNB, comit_TWOWEEKS, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BNB Minimum Deposit", async () => {
      const depositAmount = 5000000; // 5 (6-0's) 0.05 BNB

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolWBNB, comit_TWOWEEKS, depositAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // skipped because timelock for commitment yet to be implemented
    it.skip("Withdraw BNB", async () => {
      const withdrawAmount = 30000000; // 3 (7-0's)  0.3 BNB

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolWBNB, comit_TWOWEEKS, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.sub(BigNumber.from(withdrawAmount)),
      );
    });

    it("Withdraw BNB(more than deposited)", async () => {
      const withdrawAmount = 300000000; // 3 (8-0's)  3 BNB

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolWBNB, comit_TWOWEEKS, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });
  });

  describe("Test: Deposit (Commit One Month)", async () => {
    const symbolWBNB = "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
    const symbolUsdt = "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
    const symbolUsdc = "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
    const symbolBtc = "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t

    const comit_ONEMONTH = utils.formatBytes32String("comit_ONEMONTH");

    before(async () => {
      // fetching accounts

      // deploying relevant contracts
      tokenList = await ethers.getContractAt("TokenList", diamondAddress);
      deposit = await ethers.getContractAt("Deposit", diamondAddress);

      // deploying tokens
      bepUsdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
      bepBtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
      bepUsdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
      bepWbnb = await ethers.getContractAt("BEP20Token", rets["tWBNBAddress"]);
    });

    // USDT Deposits
    it("USDT New Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdt, comit_ONEMONTH, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDT Add to Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDT

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdt, comit_ONEMONTH, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDT Minimum Deposit", async () => {
      const depositAmount = 500000000; // 50 (8-0's) 50 UDST

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await bepUsdt.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdt, comit_ONEMONTH, depositAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // skipped because timelock for commitment yet to be implemented
    it.skip("Withdraw USDT", async () => {
      const withdrawAmount = 50000000000; // 500 8-0's 500 USDT
      const currentProvider = waffle.provider;
      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdt, comit_ONEMONTH, withdrawAmount)).to.be
        .reverted;

      const timeInSeconds = 30 * 24 * 60 * 60 + 20;
      await currentProvider.send("evm_increaseTime", [timeInSeconds]);
      await currentProvider.send("evm_mine");

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdt, comit_ONEMONTH, withdrawAmount)).emit(
        deposit,
        "DepositWithdrawal",
      );

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.lte(
        reserveBalance.sub(BigNumber.from(withdrawAmount)),
      );
    });

    it("Withdraw USDT(more than deposited)", async () => {
      const withdrawAmount = 600000000000; // 600 8-0's 600 USDT

      const reserveBalance = BigNumber.from(await bepUsdt.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdt, comit_ONEMONTH, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepUsdt.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // USDC Deposits
    it("USDC New Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdc, comit_ONEMONTH, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDC Add to Deposit", async () => {
      const depositAmount = 50000000000; // 500 (8-0's) 500 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdc, comit_ONEMONTH, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("USDC Minimum Deposit", async () => {
      const depositAmount = 500000000; // 50 (8-0's) 50 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await bepUsdc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolUsdc, comit_ONEMONTH, depositAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // skipped because timelock for commitment yet to be implemented
    it.skip("Withdraw USDC", async () => {
      const withdrawAmount = 50000000000; // 500 8-0's 500 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdc, comit_ONEMONTH, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance,
      );
    });

    it("Withdraw USDC(more than deposited)", async () => {
      const withdrawAmount = 600000000000; // 6000 8-0's 600 USDC

      const reserveBalance = BigNumber.from(await bepUsdc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolUsdc, comit_ONEMONTH, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepUsdc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // BTC Deposits
    it("BTC New Deposit", async () => {
      const depositAmount = 20000000; // 2 (7-0's)  0.2 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolBtc, comit_ONEMONTH, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BTC Add to Deposit", async () => {
      const depositAmount = 15000000; // 15 (6-0's) 0.15 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolBtc, comit_ONEMONTH, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BTC Minimum Deposit", async () => {
      const depositAmount = 5000000; // 5 (6-0's) 0.05 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await bepBtc.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolBtc, comit_ONEMONTH, depositAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // skipped because timelock for commitment yet to be implemented
    it.skip("Withdraw BTC", async () => {
      const withdrawAmount = 20000000; // 2 (7-0's)  0.2 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolBtc, comit_ONEMONTH, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance,
      );
    });

    it("Withdraw BTC(more than deposited)", async () => {
      const withdrawAmount = 200000000; // 2 (8-0's)  2 BTC

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolBtc, comit_ONEMONTH, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // BNB Deposits
    it("BNB New Deposit", async () => {
      const depositAmount = 30000000; // 3 (7-0's)  0.3 BNB

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolWBNB, comit_ONEMONTH, depositAmount)).emit(
        deposit,
        "NewDeposit",
      );

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BNB Add to Deposit", async () => {
      const depositAmount = 28000000; // 28 (6-0's) 0.28 BTC

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolWBNB, comit_ONEMONTH, depositAmount)).emit(
        deposit,
        "DepositAdded",
      );

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.add(BigNumber.from(depositAmount)),
      );
    });

    it("BTC Minimum Deposit", async () => {
      const depositAmount = 5000000; // 5 (6-0's) 0.05 BNB

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await bepWbnb.connect(accounts[1]).approve(diamondAddress, depositAmount);

      await expect(deposit.connect(accounts[1]).depositRequest(symbolWBNB, comit_ONEMONTH, depositAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });

    // skipped because timelock for commitment yet to be implemented
    it.skip("Withdraw BNB", async () => {
      const withdrawAmount = 30000000; // 3 (7-0's)  0.3 BNB

      const reserveBalance = BigNumber.from(await bepWbnb.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolWBNB, comit_ONEMONTH, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepWbnb.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        reserveBalance.sub(BigNumber.from(withdrawAmount)),
      );
    });

    it("Withdraw BNB(more than deposited)", async () => {
      const withdrawAmount = 300000000; // 3 (8-0's)  3 BNB

      const reserveBalance = BigNumber.from(await bepBtc.balanceOf(diamondAddress));

      await expect(deposit.connect(accounts[1]).withdrawDeposit(symbolBtc, comit_ONEMONTH, withdrawAmount)).to.be
        .reverted;

      expect(BigNumber.from(await bepBtc.balanceOf(diamondAddress)), "Reserve Balance unequal").to.equal(
        BigNumber.from(reserveBalance),
      );
    });
  });
});
