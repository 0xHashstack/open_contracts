const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  let accounts = await ethers.getSigners();
  const upgradeAdmin = accounts[0];

  console.log("Address UpgradeAdmin: ", upgradeAdmin.address);
  const pancakeRouterAddr = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";
  const pancakeRouter = await ethers.getContractAt("PancakeRouter", pancakeRouterAddr);
  const path = ["0x0720429730815D5033E66832608434E387da67DC", "0x6D655bABFA455Ffeb7f715F16Da4B0B55e6aC94d"];
  const amount = await pancakeRouter.getAmountsOut(ethers.utils.parseUnits("20000000", 8), path);
  console.log("Amount: ", amount);
  const tbtc = await ethers.getContractAt("BEP20Token", "0x0720429730815D5033E66832608434E387da67DC");
  await tbtc.approve(pancakeRouterAddr, ethers.utils.parseUnits("2000000000", 8));
  const amt = await pancakeRouter
    .connect(upgradeAdmin)
    .swapExactTokensForTokens(
      ethers.utils.parseUnits("2000000000", 8),
      1,
      path,
      upgradeAdmin.address,
      Date.now() + 60 * 30,
      {
        gasLimit: 8000000,
      },
    );
    console.log("Amount1: ", amt);
}
main();