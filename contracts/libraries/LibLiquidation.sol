// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import "./LibSwap.sol";
import "./LibLoan2.sol";
import { IPancakeRouter01 } from "../interfaces/IPancakeRouter01.sol";
import { IAccessRegistry } from "../interfaces/IAccessRegistry.sol";
import "hardhat/console.sol";

library LibLiquidation {
    function _validateLiquidator(address liquidator, address account) private returns (bool validLiquidator) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        DepositRecords[] memory deposits = ds.savingsPassbook[account].deposits;
        uint256 usdDeposited;
        for (uint256 i = 0; i < deposits.length; i++) {
            console.log("validate liquidator ====");
            usdDeposited += (LibOracle._getQuote(deposits[i].market)) * deposits[i].amount;
            console.log(usdDeposited);
            if (usdDeposited >= 2500) break;
        }

        require(usdDeposited >= 2500, "Liquidator criteria not met!");
        return true;
    }

    function _validLoanLiquidation(LoanRecords memory loan, CollateralRecords memory collateral)
        private
        view
        returns (bool)
    {
        console.log("validate loan liquidation ====");
        console.logBytes32(loan.market);
        uint256 loanMarketPrice = LibOracle._getQuote(loan.market);
        console.log("loan market price====", loanMarketPrice);
        uint256 collateralMarketPrice;
        if (loan.market == collateral.market) {
            collateralMarketPrice = loanMarketPrice;
        } else {
            collateralMarketPrice = LibOracle._getQuote(collateral.market);
        }

        console.log("collateral market price====", collateralMarketPrice);

        uint256 usdLoan = loanMarketPrice * loan.amount;
        uint256 usdCollateral = collateralMarketPrice * collateral.initialAmount;
        if ((usdLoan / usdCollateral) == 0) {
            // DC 1
            console.log("dc1 hit", (loanMarketPrice * 100) - (loan.initialMarketPrice * 100));
            // require((loanMarketPrice * 100) - (loan.initialMarketPrice * 100) >= 6, "Liquidation price not hit");
            return (loanMarketPrice * 100) - (loan.initialMarketPrice * 100) >= 6;
        } else if ((usdLoan / usdCollateral) == 1) {
            // DC 2
            console.log("dc2 hit", (loanMarketPrice * 100) - (loan.initialMarketPrice * 100));
            // require((loanMarketPrice * 100) - (loan.initialMarketPrice * 100) >= 5, "Liquidation price not hit");
            return (loanMarketPrice * 100) - (loan.initialMarketPrice * 100) >= 5;
        } else {
            // DC 3
            console.log("dc3 hit", (loanMarketPrice * 100) - (loan.initialMarketPrice * 100));
            // require((loanMarketPrice * 100) - (loan.initialMarketPrice * 100) >= 4, "Liquidation price not hit");
            return (loanMarketPrice * 100) - (loan.initialMarketPrice * 100) >= 4;
        }
    }

    function _liquidation(
        address liquidator,
        address account,
        bytes32 _market,
        bytes32 _commitment
    ) internal returns (uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();

        LoanAccount storage loanAccount = ds.loanPassbook[account];
        LoanState storage loanState = ds.indLoanState[account][_market][_commitment];
        LoanRecords storage loan = ds.indLoanRecords[account][_market][_commitment];
        CollateralRecords storage collateral = ds.indCollateralRecords[account][_market][_commitment];
        DeductibleInterest storage deductibleInterest = ds.indAccruedAPR[account][_market][_commitment];
        CollateralYield storage cYield = ds.indAccruedAPY[account][_market][_commitment];

        require(loan.id != 0, "ERROR: Loan does not exist");
        if (!_validLoanLiquidation(loan, collateral)) {
            revert("Liquidation price not hit");
        }
        uint256 loanAmount = loan.amount;

        LibReserve._updateReservesLoan(collateral.market, collateral.amount, 1);
        if (IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.protocolOwnedLiquidator, liquidator)) {
            // protocol initiated liquidation
            uint256 remnantAmount = LibLoan2._repaymentProcess(
                loan.id - 1,
                0,
                loanAccount,
                loan,
                loanState,
                collateral,
                deductibleInterest,
                cYield,
                true
            );
            LibReserve._updateReservesLoan(loan.market, remnantAmount, 0);
        } else if (_validateLiquidator(liquidator, account)) {
            // external liquidator with valid access
            IBEP20(LibCommon._connectMarket(loan.market)).transferFrom(liquidator, address(this), loan.amount);
            uint256 remnantAmount = LibLoan2._repaymentProcess(
                loan.id - 1,
                loan.amount,
                loanAccount,
                loan,
                loanState,
                collateral,
                deductibleInterest,
                cYield,
                true
            );
            IBEP20(LibCommon._connectMarket(loan.market)).transfer(
                liquidator,
                remnantAmount - (remnantAmount - ((70 * (remnantAmount - loan.amount)) / 100))
            );
            LibReserve._updateReservesLoan(
                loan.market,
                remnantAmount - ((70 * (remnantAmount - loan.amount)) / 100),
                0
            );
        }

        LibReserve._updateUtilisationLoan(loan.market, loan.amount, 1);

        /// DELETING THE LOAN ENTRIES
        /// COLLATERAL RECORDS
        delete collateral.id;
        delete collateral.market;
        delete collateral.commitment;
        delete collateral.amount;
        delete collateral.isCollateralisedDeposit;
        delete collateral.timelockValidity;
        delete collateral.isTimelockActivated;
        delete collateral.activationTime;
        delete collateral.initialAmount;

        /// LOAN ACCOUNT
        delete loanAccount.loans[loan.id];
        delete loanAccount.collaterals[loan.id];
        delete loanAccount.loanState[loan.id];

        /// LOAN RECORDS
        delete loan.id;
        delete loan.market;
        delete loan.commitment;
        delete loan.amount;
        delete loan.isSwapped;
        delete loan.lastUpdate;
        delete loan.initialMarketPrice;

        /// LOAN STATE
        delete loanState.id;
        delete loanState.loanMarket;
        delete loanState.actualLoanAmount;
        delete loanState.currentMarket;
        delete loanState.currentAmount;
        delete loanState.state;

        return loanAmount;
    }

    function _liquidableLoans(uint256 _indexFrom, uint256 _indexTo)
        internal
        view
        returns (
            bytes32[] memory loanMarket,
            bytes32[] memory loanCommitment,
            uint256[] memory loanAmount,
            bytes32[] memory collateralMarket,
            uint256[] memory collateralAmount
        )
    {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        require(_indexTo < ds.borrowers.length, "Index out of bounds");

        bytes32[] memory loanMarket = new bytes32[](10);
        bytes32[] memory loanCommitment = new bytes32[](10);
        uint256[] memory loanAmount = new uint256[](10);
        bytes32[] memory collateralMarket = new bytes32[](10);
        uint256[] memory collateralAmount = new uint256[](10);

        uint8 pointer;

        for (uint256 i = _indexFrom; i <= _indexTo; i++) {
            LoanAccount memory loanAccount = ds.loanPassbook[ds.borrowers[i]];
            LoanRecords[] memory loans = loanAccount.loans;
            CollateralRecords[] memory collaterals = loanAccount.collaterals;
            for (uint256 j = 0; j < loans.length; j++) {
                LoanRecords memory loan = loans[j];
                CollateralRecords memory collateral = collaterals[j];
                if (loan.id != 0 && _validLoanLiquidation(loan, collateral)) {
                    loanMarket[pointer] = loan.market;
                    loanCommitment[pointer] = loan.commitment;
                    loanAmount[pointer] = loan.amount;
                    collateralMarket[pointer] = collateral.market;
                    collateralAmount[pointer] = collateral.initialAmount;
                    pointer += 1;
                }
                if (pointer == 10) {
                    break;
                }
            }
        }

        return (loanMarket, loanCommitment, loanAmount, collateralMarket, collateralAmount);
    }
}
