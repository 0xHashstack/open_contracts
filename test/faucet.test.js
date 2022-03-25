const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, waffle } = require("hardhat");
const utils = require("ethers").utils;

const { deployDiamond, provideLiquidity } = require("../scripts/deploy_all.js");
const { addMarkets } = require("../scripts/deploy_all.js");

let diamondAddress;
let rets;
let tokenList;
let library;
let deposit;
let faucet;
let accounts;

let bepBtc;
let bepUsdc;
let bepUsdt;
let bepWbnb;

describe("Testing Faucet", async () => {
  before(async () => {
    array = await deployDiamond();
    diamondAddress = array["diamondAddress"];
    rets = await addMarkets(array);
    accounts = await ethers.getSigners();
  });

  describe("Test: Deposit (Commit None)", async () => {

    const comit_NONE = utils.formatBytes32String("comit_NONE");

    before(async () => {
      faucet = await ethers.getContractAt("Faucet", rets["faucetAddress"]);
    });

    it("Faucet Testing", async () => {
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

    it("Faucet Testing (Timelock-Check)", async () => {
      await expect(faucet.connect(accounts[1]).getTokens(0)).to.be.reverted;

      await expect(faucet.connect(accounts[1]).getTokens(1)).to.be.reverted;

      await expect(faucet.connect(accounts[1]).getTokens(2)).to.be.reverted;

      await expect(faucet.connect(accounts[1]).getTokens(3)).to.be.reverted;
    });

  });
});