const { keccak256 } = require("@ethersproject/keccak256");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { minAmount } = require("./minimumAmount.js");
const utils = require("ethers").utils;
const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");
const { mkdirSync, existsSync, readFileSync, writeFileSync } = require("fs");
const fs = require("fs");

async function main() {
  const diamondAddress = await deployDiamond();
  const rets = await addMarkets(diamondAddress);
  await provideLiquidity(rets);
}
// Deploy Diamond

/// DEPLOY ALL CONTRACTS
async function deployDiamond() {
  const accounts = await ethers.getSigners();
  const upgradeAdmin = accounts[0];
  mkdirSync("abi/frontend", { recursive: true });
  mkdirSync("abi/backend", { recursive: true });

  console.log(`upgradeAdmin ${upgradeAdmin.address}`);
  //   fs.writeFile('/Users/tripp/Desktop/Hashstack/Newer/Open-contracts/env.js',upgradeAdmin.address, function(err) {
  //     if(err) {
  //         return console.log(err);
  //     }

  //     console.log("The file was saved!");
  // }); ;

  /// DEPLOY DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  let diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.deployed();
  createAbiJSON(diamondCutFacet, "DiamondCutFacet");

  console.log("DiamondCutFacet deployed:", diamondCutFacet.address);

  /// DEPLOY FACETS OF DIAMOND
  console.log("");
  console.log("Deploying facets");
  const FacetNames = ["DiamondLoupeFacet"];
  const cut = [];
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    createAbiJSON(facet, FacetNames);
    console.log(`${FacetName} deployed: ${facet.address}`);
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
      facetId: 1,
    });
  }

  /// DEPLOY ACCESS_REGISTRY
  const AccessRegistry = await ethers.getContractFactory("AccessRegistry");
  const accessRegistry = await AccessRegistry.deploy(upgradeAdmin.address);
  const accessRegistryAddress = accessRegistry.address;
  console.log("AccessRegistry deployed at ", accessRegistry.address);

  console.log("Begin deploying facets");
  const OpenNames = [
    "TokenList",
    "Comptroller",
    "Liquidator",
    "Reserve",
    "OracleOpen",
    "Loan",
    "Loan1",
    "Loan2",
    "Deposit",
  ];
  const opencut = [];
  let facetId = 10;

  /// DEPLOY FACETS OF DIAMOND
  for (const FacetName of OpenNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();

    /// Creating ABI's FOR FACETS
    console.log(`Creating ABI for ${FacetName}`);
    createAbiJSON(facet, FacetName);
    console.log(`${FacetName} deployed: ${facet.address}`);
    opencut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
      facetId: facetId,
    });
    facetId++;
  }
  opencut[6]["facetId"] = 15;

  console.log("Begin diamondcut facets");

  // deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.deployed();
  createAbiJSON(diamondInit, "DiamondInit");
  console.log("DiamondInit deployed:", diamondInit.address);

  ///DEPLOY DIAMOND
  const Diamond = await ethers.getContractFactory("OpenDiamond");
  const diamond = await Diamond.deploy(upgradeAdmin.address, diamondCutFacet.address);
  await diamond.deployed();
  createAbiJSON(diamond, "OpenDiamond");
  console.log("Diamond deployed:", diamond.address);

  // upgrade diamond with facets
  console.log("");
  // console.log('Diamond Cut:', cut)
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
  createAbiJSON(diamondCut, "IDiamondCut");
  let tx;
  let receipt;
  let args = [];
  args.push(upgradeAdmin.address);
  args.push(opencut[3]["facetAddress"]);
  args.push(accessRegistry.address);
  console.log(args);
  // call to init function
  let functionCall = diamondInit.interface.encodeFunctionData("init", args);
  console.log("functionCall is ", functionCall);
  tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
  console.log("Diamond cut tx: ", tx.hash);
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }

  console.log("Completed diamond cut");
  console.log("Begin diamondcut facets");

  diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", diamond.address);
  createAbiJSON(diamondCutFacet, "DiamondCutFacet");

  tx = await diamondCutFacet.diamondCut(opencut, ethers.constants.AddressZero, "0x", { gasLimit: 8000000 });
  receipt = await tx.wait();

  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  const diamondAddress = diamond.address;
  return {
    diamondAddress,
    accessRegistryAddress,
  };
}

/// ADDMARKETS()
async function addMarkets(array) {
  const accounts = await ethers.getSigners();
  const upgradeAdmin = accounts[0];
  const diamondAddress = array["diamondAddress"];
  const accessRegistryAddress = array["accessRegistryAddress"];
  const diamond = await ethers.getContractAt("OpenDiamond", diamondAddress);
  const tokenList = await ethers.getContractAt("TokenList", diamondAddress);
  const comptroller = await ethers.getContractAt("Comptroller", diamondAddress);
  createAbiJSON(diamond, "OpenDiamond");

  /// BYTES32 MARKET SYMBOL BYTES32
  const symbolWBNB = "0x57424e4200000000000000000000000000000000000000000000000000000000"; // WBNB
  const symbolUsdt = "0x555344542e740000000000000000000000000000000000000000000000000000"; // USDT.t
  const symbolUsdc = "0x555344432e740000000000000000000000000000000000000000000000000000"; // USDC.t
  const symbolBtc = "0x4254432e74000000000000000000000000000000000000000000000000000000"; // BTC.t
  const symbolSxp = "0x5358500000000000000000000000000000000000000000000000000000000000"; // SXP
  const symbolCAKE = "0x43414b4500000000000000000000000000000000000000000000000000000000"; // CAKE

  /// BYTES32 COMMINTMENT PERIOD
  const comit_NONE = "0x636f6d69745f4e4f4e4500000000000000000000000000000000000000000000";
  const comit_TWOWEEKS = "0x636f6d69745f54574f5745454b53000000000000000000000000000000000000";
  const comit_ONEMONTH = "0x636f6d69745f4f4e454d4f4e5448000000000000000000000000000000000000";
  const comit_THREEMONTHS = "0x636f6d69745f54485245454d4f4e544853000000000000000000000000000000";

  /// SET COMMITMENT PERIOD
  console.log("setCommitment begin");
  await comptroller.connect(upgradeAdmin).setCommitment(comit_NONE);
  await comptroller.connect(upgradeAdmin).setCommitment(comit_TWOWEEKS);
  await comptroller.connect(upgradeAdmin).setCommitment(comit_ONEMONTH);
  await comptroller.connect(upgradeAdmin).setCommitment(comit_THREEMONTHS);
  console.log("setCommitment complete");

  /// UPDATE APY
  console.log("updateAPY begin");
  await comptroller.connect(upgradeAdmin).updateAPY(comit_NONE, 780);
  await comptroller.connect(upgradeAdmin).updateAPY(comit_TWOWEEKS, 1000);
  await comptroller.connect(upgradeAdmin).updateAPY(comit_ONEMONTH, 1500);
  await comptroller.connect(upgradeAdmin).updateAPY(comit_THREEMONTHS, 1800);
  console.log("updateAPY complete");

  /// UPDATE APR
  console.log("updateAPR begin");
  await comptroller.connect(upgradeAdmin).updateAPR(comit_NONE, 1800);
  await comptroller.connect(upgradeAdmin).updateAPR(comit_TWOWEEKS, 1800);
  await comptroller.connect(upgradeAdmin).updateAPR(comit_ONEMONTH, 1500);
  await comptroller.connect(upgradeAdmin).updateAPR(comit_THREEMONTHS, 1500);
  console.log("updateAPR complete");

  /// DEPLOYING TEST TOKENS
  console.log("Deploy test tokens");
  const admin_ = upgradeAdmin.address;
  const Mockup = await ethers.getContractFactory("BEP20Token");

  /// DEPLOY BTC.T
  const tbtc = await Mockup.deploy("Bitcoin", "BTC.t", 18, 21000000); // 21 million BTC
  await tbtc.deployed();
  const tBtcAddress = tbtc.address;
  console.log("tBTC deployed: ", tbtc.address);

  /// DEPLOY USDC.T
  const tusdc = await Mockup.deploy("USD-Coin", "USDC.t", 18, 10000000000); // 10 billion USDC
  await tusdc.deployed();
  const tUsdcAddress = tusdc.address;
  console.log("tUSDC deployed: ", tusdc.address);

  /// DEPLOY USDT.T
  const tusdt = await Mockup.deploy("USD-Tether", "USDT.t", 18, 10000000000); // 10 billion USDT
  await tusdt.deployed();
  const tUsdtAddress = tusdt.address;
  console.log("tUSDT deployed: ", tusdt.address);

  /// DEPLOY SXP.T
  const tsxp = await Mockup.deploy("SXP", "SXP.t", 18, 1000000000); // 1 billion SXP
  await tsxp.deployed();
  const tSxpAddress = tsxp.address;
  console.log("tSxp deployed: ", tsxp.address);

  /// DEPLOY CAKE.T
  const tcake = await Mockup.deploy("CAKE", "CAKE.t", 18, 2700000000); // 2.7 billion CAKE
  await tcake.deployed();
  const tCakeAddress = tcake.address;
  console.log("tCake deployed: ", tcake.address);

  /// DEPLOY WBNB.T
  const twbnb = await Mockup.deploy("WBNB", "WBNB.t", 18, 90000000); // 90 million WBNB
  await twbnb.deployed();
  const tWBNBAddress = twbnb.address;
  console.log("tWBNB deployed: ", twbnb.address);

  console.log(`Test tokens deployed at
        BTC: ${tBtcAddress}
        USDC: ${tUsdcAddress}
        USDT: ${tUsdtAddress}
        WBNB: ${tWBNBAddress}
        SXP: ${tSxpAddress}
        CAKE: ${tCakeAddress}`);

  /// APPROVING TOKENS FOR DIAMOND
  console.log("Approval diamond");
  await tbtc.approve(diamondAddress, "5000000000000000000000000");
  await tusdc.approve(diamondAddress, "5000000000000000000000000");
  await tusdt.approve(diamondAddress, "5000000000000000000000000");
  await tsxp.approve(diamondAddress, "5000000000000000000000000");
  await tcake.approve(diamondAddress, "5000000000000000000000000");
  await twbnb.approve(diamondAddress, "5000000000000000000000000");

  /// ADD PRIMARY MARKETS & MINAMOUNT()
  // console.log("addMarket & minAmount");
  console.log("Network ID: ", ethers.provider.network.chainId);
  const chainId = ethers.provider.network.chainId;
  const minUSDT = BigNumber.from(minAmount(symbolUsdt, chainId));
  const minUSDC = BigNumber.from(minAmount(symbolUsdc, chainId));
  const minBTC = BigNumber.from(minAmount(symbolBtc, chainId));
  const minBNB = BigNumber.from(minAmount(symbolWBNB, chainId));
  console.log("Min Amount Implemented");

  // 100 USDT [minAmount]
  await tokenList.connect(upgradeAdmin).addMarketSupport(symbolUsdt, 18, tUsdtAddress, minUSDT, {
    gasLimit: 800000,
  });
  console.log(`tUSDT added ${minUSDT}`);

  // 100 USDC [minAmount]
  await tokenList.connect(upgradeAdmin).addMarketSupport(symbolUsdc, 18, tUsdcAddress, minUSDC, {
    gasLimit: 800000,
  });
  console.log(`tUSDC added ${minUSDC}`);

  // 0.1 BTC [minAmount]
  await tokenList.connect(upgradeAdmin).addMarketSupport(symbolBtc, 18, tBtcAddress, minBTC, { gasLimit: 800000 });
  console.log(`tBTC added ${minBTC}`);

  // 0.25 BNB [minAmount]
  await tokenList.connect(upgradeAdmin).addMarketSupport(symbolWBNB, 18, tWBNBAddress, minBNB, {
    gasLimit: 800000,
  });
  console.log(`twBNB added ${minBNB}`);

  console.log("primary markets added");

  /// ADD SECONDARY MARKETS
  console.log("adding secondary markets");
  await tokenList.connect(upgradeAdmin).addMarket2Support(symbolSxp, 18, tSxpAddress, { gasLimit: 800000 });
  await tokenList.connect(upgradeAdmin).addMarket2Support(symbolCAKE, 18, tCakeAddress, { gasLimit: 800000 });

  console.log(`Secondary markets
        SXP: ${symbolSxp}: ${tSxpAddress}
        CAKE: ${symbolCAKE}: ${tCakeAddress}`);
  console.log("secondary markets added");
  // console.log(`admin balance is , ${await tbtc.balanceOf(admin_)}`);

  /// TRANSFERRING TOKENS TO DIAMOND(RESERVES)
  await tusdt.transfer(diamondAddress, "2000000000000000000000000000");
  await tusdc.transfer(diamondAddress, "2000000000000000000000000000");
  await tbtc.transfer(diamondAddress, "4200000000000000000000000");
  await twbnb.transfer(diamondAddress, "18000000000000000000000000");

  // UPDATE AVAILABLE RESERVES
  await comptroller.connect(upgradeAdmin).updateReservesDeposit(symbolBtc, "4200000000000000000000000");
  await comptroller.connect(upgradeAdmin).updateReservesDeposit(symbolUsdc, "2000000000000000000000000000");
  await comptroller.connect(upgradeAdmin).updateReservesDeposit(symbolUsdt, "2000000000000000000000000000");
  await comptroller.connect(upgradeAdmin).updateReservesDeposit(symbolWBNB, "18000000000000000000000000");

  /// DEPLOY FAUCET
  const Faucet = await ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy();
  createAbiJSON(faucet, "Faucet");
  console.log("Faucet deployed at ", faucet.address);

  const faucetAddress = faucet.address;
  /// TRANSFERRING TOKENS TO FAUCET
  await tusdt.transfer(faucet.address, "6000000000000000000000000000"); // 6 billion USDT
  console.log("6000000000 tusdt transfered to faucet. Token being :", tUsdtAddress);
  console.log(await tusdt.balanceOf(faucet.address));

  await tusdc.transfer(faucet.address, "6000000000000000000000000000"); // 6 billion USDC
  console.log("6000000000 tusdc transfered to faucet. Token being :", tUsdcAddress);
  console.log(await tusdc.balanceOf(faucet.address));

  await tbtc.transfer(faucet.address, "12600000000000000000000000");
  console.log("12600000 tbtc transfered to faucet. Token being :", tBtcAddress); // 12.6 million BTC
  console.log(await tbtc.balanceOf(faucet.address));

  await twbnb.transfer(faucet.address, "54000000000000000000000000"); // 54 million BNB
  console.log("54000000 twbnb transfered to faucet. Token being :", tWBNBAddress);
  console.log(await twbnb.balanceOf(faucet.address));

  /// UPADTING FAUCET BALANCE & FUNDS_LEAK
  await faucet.connect(upgradeAdmin)._updateTokens(
    tUsdtAddress,
    "6000000000000000000000000000", // 6 billion USDT
    "10000000000000000000000", // 10000 USDT
  );
  await faucet.connect(upgradeAdmin)._updateTokens(
    tUsdcAddress,
    "6000000000000000000000000000", // 6 billion USDC
    "10000000000000000000000", // 10000 USDC
  );
  await faucet.connect(upgradeAdmin)._updateTokens(
    tBtcAddress,
    "12600000000000000000000000", // 12.6 million BTC
    "5000000000000000000", // 5 BTC
  );
  await faucet.connect(upgradeAdmin)._updateTokens(
    tWBNBAddress,
    "54000000000000000000000000", // 54 million BNB
    "100000000000000000000", // 100 BNB
  );

  /// SET FEES IN COMPTROLLER
    console.log("Implementing fees in Comptroller")
  await comptroller.updateLoanIssuanceFees("10");
  console.log("updateWithdrawalFees is set");
  await comptroller.updateloanClosureFees("5"); // set fee to 0.05%
  console.log("updateWithdrawalFees is set");
  await comptroller.updateDepositPreclosureFees("36"); // Set fee to 0.36%
  console.log("updateDepositPreclosureFees is set");
  await comptroller.updateWithdrawalFees("17"); // Set fee to 0.17%
  console.log("updateWithdrawalFees is set");
  await comptroller.updateCollateralReleaseFees("10"); // set fee to 0.1%
  console.log("updateCollateralReleaseFees is set");
  await comptroller.updateMarketSwapFees("5"); // Set fee to 0.05%
  console.log("updateMarketSwapFees is set");
  // await comptroller.updateReserveFactor();
  // console.log("updateReserveFactor is set");
  console.log("Fees implemented in Comptroller")



  console.log("ALL ENV USED IN UI");

  console.log("REACT_APP_DIAMOND_ADDRESS = ", diamond.address);
  console.log("REACT_APP_FAUCET_ADDRESS = ", faucet.address);
  console.log("REACT_APP_T_BTC_ADDRESS = ", tBtcAddress);
  console.log("REACT_APP_T_USDC_ADDRESS = ", tUsdcAddress);
  console.log("REACT_APP_T_USDT_ADDRESS = ", tUsdtAddress);
  console.log("REACT_APP_T_SXP_ADDRESS = ", tSxpAddress);
  console.log("REACT_APP_T_CAKE_ADDRESS = ", tCakeAddress);
  console.log("REACT_APP_T_WBNB_ADDRESS = ", tWBNBAddress);
  fs.writeFile(
    "addr.js",
    "REACT_APP_DIAMOND_ADDRESS = " +
      diamond.address +
      "\r\n" +
      "REACT_APP_FAUCET_ADDRESS = " +
      faucet.address +
      "\r\n" +
      "REACT_APP_T_USDC_ADDRESS = " +
      tUsdcAddress +
      "\r\n" +
      "REACT_APP_T_USDT_ADDRESS = " +
      tUsdtAddress +
      "\r\n" +
      "REACT_APP_T_SXP_ADDRESS = " +
      tSxpAddress +
      "\r\n" +
      "REACT_APP_T_CAKE_ADDRESS = " +
      tCakeAddress +
      "\r\n" +
      "REACT_APP_T_WBNB_ADDRESS = " +
      tWBNBAddress,
    function (err) {
      if (err) {
        return console.log(err);
      }

      console.log("The addresses are saved!");
    },
  );

  return {
    tBtcAddress,
    tUsdtAddress,
    tUsdcAddress,
    tSxpAddress,
    tCakeAddress,
    tWBNBAddress,
    faucetAddress,
    accessRegistryAddress,
  };
}

/// CREATE LIQUIDITY POOL
async function provideLiquidity(rets) {
  console.log("Start LP making");
  const accounts = await ethers.getSigners();
  const upgradeAdmin = accounts[0];
  const pancakeRouterAddr = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";
  const tbtc = await ethers.getContractAt("BEP20Token", rets["tBtcAddress"]);
  const tusdc = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
  const tusdt = await ethers.getContractAt("BEP20Token", rets["tUsdtAddress"]);
  const twbnb = await ethers.getContractAt("BEP20Token", rets["tWBNBAddress"]);
  const tcake = await ethers.getContractAt("BEP20Token", rets["tCakeAddress"]);
  const tsxp = await ethers.getContractAt("BEP20Token", rets["tSxpAddress"]);

  const pancakeRouter = await ethers.getContractAt("PancakeRouter", pancakeRouterAddr);

  /// USDC-WBNB LIQUIDITY
  await tusdc.approve(pancakeRouterAddr, "400000000000000000000000000");
  await twbnb.approve(pancakeRouterAddr, "1000000000000000000000000");

  await pancakeRouter.addLiquidity(
    tusdc.address,
    twbnb.address,
    "400000000000000000000000000",
    "1000000000000000000000000",
    1,
    1,
    upgradeAdmin.address,
    Date.now() + 60 * 30,
    { gasLimit: 8000000 },
  );

  console.log("USDC <-> WBNB LP done");

  /// USDT-WBNB LIQUIDITY
  await tusdt.approve(pancakeRouterAddr, "400000000000000000000000000");
  await twbnb.approve(pancakeRouterAddr, "1000000000000000000000000");

  await pancakeRouter.addLiquidity(
    tusdt.address,
    twbnb.address,
    "400000000000000000000000000",
    "1000000000000000000000000",
    1,
    1,
    upgradeAdmin.address,
    Date.now() + 60 * 30,
    { gasLimit: 8000000 },
  );
  console.log("USDT <-> WBNB LP done");

  /// BTC-WBNB LIQUIDITY
  await tbtc.approve(pancakeRouterAddr, "100000000000000000000");
  await twbnb.approve(pancakeRouterAddr, "10000000000000000000000");

  await pancakeRouter
    .connect(upgradeAdmin)
    .addLiquidity(
      tbtc.address,
      twbnb.address,
      "100000000000000000000",
      "10000000000000000000000",
      1,
      1,
      upgradeAdmin.address,
      Date.now() + 60 * 30,
      { gasLimit: 8000000 },
    );
  console.log("BTC <-> WBNB LP done");

  /// CAKE-WBNB LIQUIDITY
  await tcake.approve(pancakeRouterAddr, "250000000000000000000");
  await twbnb.approve(pancakeRouterAddr, "5000000000000000000");

  await pancakeRouter
    .connect(upgradeAdmin)
    .addLiquidity(
      tcake.address,
      twbnb.address,
      "250000000000000000000",
      "5000000000000000000",
      1,
      1,
      upgradeAdmin.address,
      Date.now() + 60 * 30,
      { gasLimit: 8000000 },
    );
  console.log("CAKE <-> WBNB LP done");

  /// SXP-WBNB LIQUIDITY
  await tsxp.approve(pancakeRouterAddr, "1000000000000000000000");
  await twbnb.approve(pancakeRouterAddr, "5000000000000000000");

  await pancakeRouter
    .connect(upgradeAdmin)
    .addLiquidity(
      tsxp.address,
      twbnb.address,
      "1000000000000000000000",
      "5000000000000000000",
      1,
      1,
      upgradeAdmin.address,
      Date.now() + 60 * 30,
      { gasLimit: 8000000 },
    );
  console.log("WBNB <-> SXP LP done");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

exports.deployDiamond = deployDiamond;
// exports.deployOpenFacets = deployOpenFacets
exports.addMarkets = addMarkets;
exports.provideLiquidity = provideLiquidity;

/// CREATE ABI OF CONTRACTS
function createAbiJSON(artifact, filename) {
  const data = JSON.parse(artifact.interface.format("json"));
  writeFileSync(`${__dirname}/../abi/backend/${filename}.json`, JSON.stringify(data));
  writeFileSync(`${__dirname}/../abi/frontend/${filename}.json`, JSON.stringify(data));
}
