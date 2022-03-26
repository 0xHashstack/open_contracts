// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import "./LibSwap.sol";
import "./LibLoan2.sol";
import { IPancakeRouter01 } from "../interfaces/IPancakeRouter01.sol";

library LibLiquidation {
    function _liquidation(
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

        uint256 remnantAmount;
        uint256 num = loan.id;
        require(loan.id != 0, "ERROR: Loan does not exist");

        remnantAmount = LibLoan2._repaymentProcess(
            loan.id - 1,
            0,
            loanAccount,
            loan,
            loanState,
            collateral,
            deductibleInterest,
            cYield
        );

        uint256 loanAmount = loan.amount;
        /// UPDATING THE RESERVES
        LibReserve._updateReservesLoan(loan.market, remnantAmount, 0);
        LibReserve._updateReservesDeposit(collateral.market, collateral.amount, 1);

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

        /// LOAN RECORDS
        delete loan.id;
        delete loan.market;
        delete loan.commitment;
        delete loan.amount;
        delete loan.isSwapped;
        delete loan.lastUpdate;

        /// LOAN STATE
        delete loanState.id;
        delete loanState.loanMarket;
        delete loanState.actualLoanAmount;
        delete loanState.currentMarket;
        delete loanState.currentAmount;
        delete loanState.state;

        /// LOAN ACCOUNT
        delete loanAccount.loans[num];
        delete loanAccount.collaterals[num];
        delete loanAccount.loanState[num];

        return loanAmount;
    }
}
