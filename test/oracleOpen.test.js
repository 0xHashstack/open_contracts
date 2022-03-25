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

let oracle;
let library;
let tokenList;
let accessRegistry;

describe("testing OracleOpen", async () => {
  before(async () => {
    array = await deployDiamond();
    diamondAddress = array["diamondAddress"];
    rets = await addMarkets(array);
    accounts = await ethers.getSigners();
    await provideLiquidity(rets);
  });

  describe("Oracle Open", async () => {
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
      oracle = await ethers.getContractAt("OracleOpen", diamondAddress);
      accessRegistry = await ethers.getContractAt(
        "AccessRegistry",
        rets["accessRegistryAddress"]
      );
    });

    it("Get Latest Price:", async () => {
      let x;
      x = BigNumber.from(await oracle.getLatestPrice(symbolBtc));
      expect(x).to.not.equal(BigNumber.from(0));

      x = BigNumber.from(await oracle.getLatestPrice(symbolUsdt));
      expect(x).to.not.equal(BigNumber.from(0));

      x = BigNumber.from(await oracle.getLatestPrice(symbolUsdc));
      expect(x).to.not.equal(BigNumber.from(0));

      x = BigNumber.from(await oracle.getLatestPrice(symbolWBNB));
      expect(x).to.not.equal(BigNumber.from(0));
    });

    it("Pause:", async () => {
      const adminOracle = utils.formatBytes32String("adminOpenOracle");
      await oracle.pauseOracle();
      expect(await oracle.isPausedOracle()).to.equal(true);

      await oracle.unpauseOracle();
      expect(await oracle.isPausedOracle()).to.equal(false);

      await expect(oracle.connect(accounts[1]).pauseOracle()).to.be
        .reverted;

      await expect(
        accessRegistry.addAdminRole(adminOracle, accounts[1].address)
      ).emit(accessRegistry, "AdminRoleDataGranted");

      await expect(
        accessRegistry.addAdminRole(adminOracle, accounts[1].address)
      ).to.be.reverted;

      await oracle.connect(accounts[1]).pauseOracle();
      expect(await oracle.isPausedOracle()).to.equal(true);

      await expect(
        accessRegistry.removeAdminRole(adminOracle, accounts[1].address)
      ).emit(accessRegistry, "AdminRoleDataRevoked");

      await expect(oracle.connect(accounts[1]).unpauseOracle()).to.be
        .reverted;
      expect(await oracle.isPausedOracle()).to.equal(true);

      await oracle.unpauseOracle();
      expect(await oracle.isPausedOracle()).to.equal(false);
    });

    // it("Get Fair Price:", async () => {
    //   let x;
    //   let requestId;
    //   x = BigNumber.from(await oracle.getFairPrice(requestId));
    //   expect(x).to.not.equal(BigNumber.from(0));
    // });

    // it("Set Fair Price:", async () => {
    //   let x;
    //   let requestId;
    //   let _fPrice;
    //   let amount;
    //   x = await oracle.getLatestPrice(requestId, _fPrice, symbolBtc, amount);
    //   expect(x).to.equal(true);
    // });
  });
});
