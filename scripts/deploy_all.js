const { keccak256 } = require("@ethersproject/keccak256");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const utils = require("ethers").utils;
const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");
const { mkdirSync, existsSync, readFileSync, writeFileSync } = require("fs");
const fs = require('fs');

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

  const superAdmin = 0x72b5b8ca10202b2492d7537bf1f6abcda23a980f7acf51a1ec8a0ce96c7d7ca8;
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
  console.log("AccessRegistry deployed at ", accessRegistry.address);

  console.log("Begin deploying facets");
  const OpenNames = [
    "TokenList",
    "Comptroller",
    "Liquidator",
    "Reserve",
    "OracleOpen",
    "Loan",
    "LoanExt",
    "LoanExtv1",
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
  const diamond = await Diamond.deploy(
    upgradeAdmin.address,
    diamondCutFacet.address
  );
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

  diamondCutFacet = await ethers.getContractAt(
    "DiamondCutFacet",
    diamond.address
  );
  createAbiJSON(diamondCutFacet, "DiamondCutFacet");

  tx = await diamondCutFacet.diamondCut(
    opencut,
    ethers.constants.AddressZero,
    "0x",
    { gasLimit: 8000000 }
  );
  receipt = await tx.wait();

  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }

  return diamond.address;
}

/// ADDMARKETS()
async function addMarkets(diamondAddress) {
  const accounts = await ethers.getSigners();
  const upgradeAdmin = accounts[0];

  const diamond = await ethers.getContractAt("OpenDiamond", diamondAddress);
  const tokenList = await ethers.getContractAt("TokenList", diamondAddress);
  const comptroller = await ethers.getContractAt("Comptroller", diamondAddress);
  createAbiJSON(diamond, "OpenDiamond");

  /// BYTES32 MARKET SYMBOL BYTES32
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

  /// BYTES32 COMMINTMENT PERIOD
  const comit_NONE =
    "0x636f6d69745f4e4f4e4500000000000000000000000000000000000000000000";
  const comit_TWOWEEKS =
    "0x636f6d69745f54574f5745454b53000000000000000000000000000000000000";
  const comit_ONEMONTH =
    "0x636f6d69745f4f4e454d4f4e5448000000000000000000000000000000000000";
  const comit_THREEMONTHS =
    "0x636f6d69745f54485245454d4f4e544853000000000000000000000000000000";

  /// CHAINLINK ORACLE ADDRESSES ADDED
  console.log("Add fairPrice addresses");
  await diamond.addFairPriceAddress(
    symbolWBNB,
    "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526"
  );
  await diamond.addFairPriceAddress(
    symbolUsdt,
    "0xEca2605f0BCF2BA5966372C99837b1F182d3D620"
  );
  await diamond.addFairPriceAddress(
    symbolUsdc,
    "0x90c069C4538adAc136E051052E14c1cD799C41B7"
  );
  await diamond.addFairPriceAddress(
    symbolBtc,
    "0x5741306c21795FdCBb9b265Ea0255F499DFe515C"
  );
  await diamond.addFairPriceAddress(
    symbolSxp,
    "0x678AC35ACbcE272651874E782DB5343F9B8a7D66"
  );
  await diamond.addFairPriceAddress(
    symbolCAKE,
    "0x81faeDDfeBc2F8Ac524327d70Cf913001732224C"
  );

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
  const tbtc = await Mockup.deploy("Bitcoin", "BTC.t", 8, 21000000); // 21 million BTC
  await tbtc.deployed();
  const tBtcAddress = tbtc.address;
  console.log("tBTC deployed: ", tbtc.address);

  /// DEPLOY USDC.T
  const tusdc = await Mockup.deploy("USD-Coin", "USDC.t", 8, 10000000000); // 10 billion USDC
  await tusdc.deployed();
  const tUsdcAddress = tusdc.address;
  console.log("tUSDC deployed: ", tusdc.address);

  /// DEPLOY USDT.T
  const tusdt = await Mockup.deploy("USD-Tether", "USDT.t", 8, 10000000000); // 10 billion USDT
  await tusdt.deployed();
  const tUsdtAddress = tusdt.address;
  console.log("tUSDT deployed: ", tusdt.address);

  /// DEPLOY SXP.T
  const tsxp = await Mockup.deploy("SXP", "SXP.t", 8, 1000000000); // 1 billion SXP
  await tsxp.deployed();
  const tSxpAddress = tsxp.address;
  console.log("tSxp deployed: ", tsxp.address);

  /// DEPLOY CAKE.T
  const tcake = await Mockup.deploy("CAKE", "CAKE.t", 8, 2700000000); // 2.7 billion CAKE
  await tcake.deployed();
  const tCakeAddress = tcake.address;
  console.log("tCake deployed: ", tcake.address);

  /// DEPLOY WBNB.T
  const twbnb = await Mockup.deploy("WBNB", "WBNB.t", 8, 90000000); // 90 million WBNB
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
  await tbtc.approve(diamondAddress, "500000000000000");
  await tusdc.approve(diamondAddress, "500000000000000");
  await tusdt.approve(diamondAddress, "500000000000000");
  await tsxp.approve(diamondAddress, "500000000000000");
  await tcake.approve(diamondAddress, "500000000000000");
  await twbnb.approve(diamondAddress, "500000000000000");

  /// MARKET ADDRESSES ADDED

  // console.log("Add fairPrice addresses");
  // await diamond.addFairPriceAddress(symbolWBNB, tWBNBAddress);
  // await diamond.addFairPriceAddress(symbolUsdt, tUsdtAddress);
  // await diamond.addFairPriceAddress(symbolUsdc, tUsdcAddress);
  // await diamond.addFairPriceAddress(symbolBtc, tBtcAddress);
  // await diamond.addFairPriceAddress(symbolSxp, tSxpAddress);
  // await diamond.addFairPriceAddress(symbolCAKE, tCakeAddress);

  /// ADD PRIMARY MARKETS & MINAMOUNT()
  console.log("addMarket & minAmount");
  const minUSDT = BigNumber.from("10000000000"); // 100 USDT, or 100 USDC
  const minUSDC = BigNumber.from("10000000000"); // 100 USDT, or 100 USDC
  const minBTC = BigNumber.from("10000000"); // 0.1 BTC
  const minBNB = BigNumber.from("25000000"); // 0.25

  // 100 USDT [minAmount]
  await tokenList
    .connect(upgradeAdmin)
    .addMarketSupport(symbolUsdt, 8, tUsdtAddress, minUSDT, {
      gasLimit: 800000,
    });
  console.log(`tUSDT added ${minUSDT}`);

  // 100 USDC [minAmount]
  await tokenList
    .connect(upgradeAdmin)
    .addMarketSupport(symbolUsdc, 8, tUsdcAddress, minUSDC, {
      gasLimit: 800000,
    });
  console.log(`tUSDC added ${minUSDC}`);

  // 0.1 BTC [minAmount]
  await tokenList
    .connect(upgradeAdmin)
    .addMarketSupport(symbolBtc, 8, tBtcAddress, minBTC, { gasLimit: 800000 });
  console.log(`tBTC added ${minBTC}`);

  // 0.25 BNB [minAmount]
  await tokenList
    .connect(upgradeAdmin)
    .addMarketSupport(symbolWBNB, 8, tWBNBAddress, minBNB, {
      gasLimit: 800000,
    });
  console.log(`twBNB added ${minBNB}`);

  console.log("primary markets added");

  /// ADD SECONDARY MARKETS
  console.log("adding secondary markets");
  await tokenList
    .connect(upgradeAdmin)
    .addMarket2Support(symbolSxp, 8, tSxpAddress, { gasLimit: 800000 });
  await tokenList
    .connect(upgradeAdmin)
    .addMarket2Support(symbolCAKE, 8, tCakeAddress, { gasLimit: 800000 });

  console.log(`Secondary markets
        SXP: ${symbolSxp}: ${tSxpAddress}
        CAKE: ${symbolCAKE}: ${tCakeAddress}`);
  console.log("secondary markets added");
  // console.log(`admin balance is , ${await tbtc.balanceOf(admin_)}`);

  /// TRANSFERRING TOKENS TO UPGRADEADMIN
  await tusdt.transfer(upgradeAdmin.address, "200000000000000000"); // 2 billion USDT
  await tusdc.transfer(upgradeAdmin.address, "200000000000000000"); // 2 billion USDC
  await tbtc.transfer(upgradeAdmin.address, "420000000000000"); // 4.2 million BTC
  await twbnb.transfer(upgradeAdmin.address, "1800000000000000"); // 18 million BNB

  /// TRANSFERRING TOKENS TO DIAMOND(RESERVES)
  await tusdt.transfer(diamondAddress, "200000000000000000");
  await tusdc.transfer(diamondAddress, "200000000000000000");
  await tbtc.transfer(diamondAddress, "420000000000000");
  await twbnb.transfer(diamondAddress, "1800000000000000");

  /// DEPLOY FAUCET
  const Faucet = await ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy();
  createAbiJSON(faucet, "Faucet");
  console.log("Faucet deployed at ", faucet.address);

  /// TRANSFERRING TOKENS TO FAUCET
  await tusdt.transfer(faucet.address, "600000000000000000"); // 6 billion USDT
  console.log(
    "6000000000 tusdt transfered to faucet. Token being :",
    tUsdtAddress
  );
  console.log(await tusdt.balanceOf(faucet.address));

  await tusdc.transfer(faucet.address, "600000000000000000"); // 6 billion USDC
  console.log(
    "6000000000 tusdc transfered to faucet. Token being :",
    tUsdcAddress
  );
  console.log(await tusdc.balanceOf(faucet.address));

  await tbtc.transfer(faucet.address, "1260000000000000");
  console.log("12600000 tbtc transfered to faucet. Token being :", tBtcAddress); // 12.6 million BTC
  console.log(await tbtc.balanceOf(faucet.address));

  await twbnb.transfer(faucet.address, "5400000000000000"); // 54 million BNB
  console.log(
    "54000000 twbnb transfered to faucet. Token being :",
    tWBNBAddress
  );
  console.log(await twbnb.balanceOf(faucet.address));

  /// UPADTING FAUCET BALANCE & FUNDS_LEAK
  await faucet.connect(upgradeAdmin)._updateTokens(
    tUsdtAddress,
    "600000000000000000", // 6 billion USDT
    "1000000000000" // 10000 USDT
  );
  await faucet.connect(upgradeAdmin)._updateTokens(
    tUsdcAddress,
    "600000000000000000", // 6 billion USDC
    "1000000000000" // 10000 USDC
  );
  await faucet.connect(upgradeAdmin)._updateTokens(
    tBtcAddress,
    "1260000000000000", // 12.6 million BTC
    "500000000" // 5 BTC
  );
  await faucet.connect(upgradeAdmin)._updateTokens(
    tWBNBAddress,
    "5400000000000000", // 54 million BNB
    "10000000000" // 100 BNB
  );

  console.log('ALL ENV USED IN UI');

  console.log("REACT_APP_DIAMOND_ADDRESS = ", diamond.address);
  
  console.log("REACT_APP_FAUCET_ADDRESS = ", faucet.address);
  
  console.log("REACT_APP_T_BTC_ADDRESS = ", tBtcAddress);
  
  console.log("REACT_APP_T_USDC_ADDRESS = ", tUsdcAddress);
  
  console.log("REACT_APP_T_USDT_ADDRESS = ", tUsdtAddress);
 
  console.log("REACT_APP_T_SXP_ADDRESS = ", tSxpAddress);

  console.log("REACT_APP_T_CAKE_ADDRESS = ", tCakeAddress);
  
  console.log("REACT_APP_T_WBNB_ADDRESS = ", tWBNBAddress);
  fs.writeFile('addr.js',("REACT_APP_DIAMOND_ADDRESS = "+ diamond.address+ '\r\n'+ "REACT_APP_FAUCET_ADDRESS = "+ faucet.address+ '\r\n'+ "REACT_APP_T_USDC_ADDRESS = "+ tUsdcAddress+ '\r\n'+ "REACT_APP_T_USDT_ADDRESS = "+ tUsdtAddress+ '\r\n'+ "REACT_APP_T_SXP_ADDRESS = "+ tSxpAddress+ '\r\n'+ "REACT_APP_T_CAKE_ADDRESS = "+ tCakeAddress+ '\r\n'+ "REACT_APP_T_WBNB_ADDRESS = "+tWBNBAddress), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The addresses are saved!");
}); ;


  return {
    tBtcAddress,
    tUsdtAddress,
    tUsdcAddress,
    tSxpAddress,
    tCakeAddress,
    tWBNBAddress,
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
  const twbnb = await ethers.getContractAt("BEP20Token", rets["tUsdcAddress"]);
  const tcake = await ethers.getContractAt("BEP20Token", rets["tCakeAddress"]);
  const tsxp = await ethers.getContractAt("BEP20Token", rets["tSxpAddress"]);

  const pancakeRouter = await ethers.getContractAt(
    "PancakeRouter",
    pancakeRouterAddr
  );
  // const pancakeFactory = await ethers.getContractAt('PancakeFactory', await pancakeRouter.factory());

  /// USDC-CAKE LIQUIDITY
  await tusdc.approve(pancakeRouterAddr, "10000000000000000");
  await tcake.approve(pancakeRouterAddr, "1000000000000000");

  await pancakeRouter.addLiquidity(
    tusdc.address,
    tcake.address,
    "1000000000000000",
    "100000000000000",
    1,
    1,
    upgradeAdmin.address,
    Date.now() + 60 * 30,
    { gasLimit: 8000000 }
  );

  console.log("USDC <-> CAKE LP done");

  /// USDT-CAKE LIQUIDITY
  await tusdt.approve(pancakeRouterAddr, "10000000000000000");
  await tcake.approve(pancakeRouterAddr, "1000000000000000");

  await pancakeRouter.addLiquidity(
    tusdt.address,
    tcake.address,
    "1000000000000000",
    "100000000000000",
    1,
    1,
    upgradeAdmin.address,
    Date.now() + 60 * 30,
    { gasLimit: 8000000 }
  );
  console.log("USDT <-> CAKE LP done");

  /// BTC-CAKE LIQUIDITY
  await tbtc.approve(pancakeRouterAddr, "120000000000");
  await tcake.approve(pancakeRouterAddr, "5000000000000000");

  await pancakeRouter
    .connect(upgradeAdmin)
    .addLiquidity(
      tbtc.address,
      tcake.address,
      "12000000000",
      "500000000000000",
      1,
      1,
      upgradeAdmin.address,
      Date.now() + 60 * 30,
      { gasLimit: 8000000 }
    );
  console.log("BTC <-> CAKE LP done");

  /// WBNB-CAKE LIQUIDITY
  await twbnb.approve(pancakeRouterAddr, "5000000000");
  await tcake.approve(pancakeRouterAddr, "250000000000");
  
  await pancakeRouter
    .connect(upgradeAdmin)
    .addLiquidity(
      twbnb.address,
      tcake.address,
      "500000000",
      "25000000000",
      1,
      1,
      upgradeAdmin.address,
      Date.now() + 60 * 30,
      { gasLimit: 8000000 }
    );
  console.log("WBNB <-> CAKE LP done");

 // LP FOR SXP

  /// USDC-SXP LIQUIDITY
  await tusdc.approve(pancakeRouterAddr, "10000000000000000");
  await tsxp.approve(pancakeRouterAddr, "1000000000000000");

  await pancakeRouter.addLiquidity(
    tusdc.address,
    tsxp.address,
    "1000000000000000",
    "100000000000000",
    1,
    1,
    upgradeAdmin.address,
    Date.now() + 60 * 30,
    { gasLimit: 8000000 }
  );

  console.log("USDC <-> SXP LP done");

  /// USDT-SXP LIQUIDITY
  await tusdt.approve(pancakeRouterAddr, "10000000000000000");
  await tsxp.approve(pancakeRouterAddr, "1000000000000000");

  await pancakeRouter.addLiquidity(
    tusdt.address,
    tsxp.address,
    "1000000000000000",
    "100000000000000",
    1,
    1,
    upgradeAdmin.address,
    Date.now() + 60 * 30,
    { gasLimit: 8000000 }
  );
  console.log("USDT <-> SXP LP done");

  /// BTC-SXP LIQUIDITY
  await tbtc.approve(pancakeRouterAddr, "120000000000");
  await tsxp.approve(pancakeRouterAddr, "5000000000000000");

  await pancakeRouter
    .connect(upgradeAdmin)
    .addLiquidity(
      tbtc.address,
      tsxp.address,
      "12000000000",
      "500000000000000",
      1,
      1,
      upgradeAdmin.address,
      Date.now() + 60 * 30,
      { gasLimit: 8000000 }
    );
  console.log("BTC <-> SXP LP done");

  /// WBNB-SXP LIQUIDITY
  await twbnb.approve(pancakeRouterAddr, "5000000000");
  await tsxp.approve(pancakeRouterAddr, "250000000000");
  
  await pancakeRouter
    .connect(upgradeAdmin)
    .addLiquidity(
      twbnb.address,
      tsxp.address,
      "500000000",
      "25000000000",
      1,
      1,
      upgradeAdmin.address,
      Date.now() + 60 * 30,
      { gasLimit: 8000000 }
    );
  console.log("WBNB <-> SXP LP done");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.deployDiamond = deployDiamond;
// exports.deployOpenFacets = deployOpenFacets
exports.addMarkets = addMarkets;
exports.provideLiquidity = provideLiquidity;

/// CREATE ABI OF CONTRACTS
function createAbiJSON(artifact, filename){
  const data = JSON.parse(artifact.interface.format("json"))
  writeFileSync(`${__dirname}/../abi/backend/${filename}.json`,JSON.stringify(data));
  writeFileSync(`${__dirname}/../abi/frontend/${filename}.json`,JSON.stringify(data));
}
