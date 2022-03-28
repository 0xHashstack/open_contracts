// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

// import "./LibSwap.sol";
import "./LibLoan2.sol";
import { IPancakeRouter01 } from "../interfaces/IPancakeRouter01.sol";
import { IAccessRegistry } from "../interfaces/IAccessRegistry.sol";
import "hardhat/console.sol";

library LibLiquidation {
    function _validateLiquidator(address liquidator) private view returns (bool validLiquidator) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        DepositRecords[] memory deposits = ds.savingsPassbook[liquidator].deposits;
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

    function _getDebtCategory(LoanRecords memory loan, CollateralRecords memory collateral)
        private
        view
        returns (uint8)
    {
        uint256 loanMarketPrice = LibOracle._getQuote(loan.market);
        uint256 collateralMarketPrice;
        if (loan.market == collateral.market) {
            collateralMarketPrice = loanMarketPrice;
        } else {
            collateralMarketPrice = LibOracle._getQuote(collateral.market);
        }

        if (((loanMarketPrice * loan.amount) / (collateralMarketPrice * collateral.initialAmount)) <= 1) {
            // DC 1
            return uint8(1);
        } else if (((loanMarketPrice * loan.amount) / (collateralMarketPrice * collateral.initialAmount)) <= 2) {
            // DC 2
            return uint8(2);
        } else {
            // DC 3
            return uint8(3);
        }
    }

    function _validLoanLiquidation(
        LoanState memory loanState,
        CollateralRecords memory collateral,
        uint8 debtCategory
    ) private view returns (bool) {
        console.log("validate loan liquidation ====");
        uint256 loanCurrentAmount = loanState.actualLoanAmount;
        uint256 collateralCurrentAmount;
        if (loanState.loanMarket != loanState.currentMarket) {
            loanCurrentAmount = LibSwap._getAmountOutMin(
                LibSwap._getMarket2Address(loanState.currentMarket),
                LibSwap._getMarketAddress(loanState.loanMarket),
                loanState.currentAmount,
                1
            );
        }

        collateralCurrentAmount = LibSwap._getAmountOutMin(
            LibSwap._getMarketAddress(collateral.market),
            LibSwap._getMarketAddress(loanState.loanMarket),
            collateral.amount,
            2
        );

        console.log("loan current amount====", loanCurrentAmount);
        console.log("collateral current amount====", collateralCurrentAmount);

        if (debtCategory == 1) {
            return ((106 * loanState.actualLoanAmount) / 100) >= (loanCurrentAmount + collateralCurrentAmount);
        } else if (debtCategory == 2) {
            return ((105 * loanState.actualLoanAmount) / 100) >= (loanCurrentAmount + collateralCurrentAmount);
        } else {
            return ((104 * loanState.actualLoanAmount) / 100) >= (loanCurrentAmount + collateralCurrentAmount);
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

        LibLoan._accruedInterest(account, loanState.currentMarket, loan.commitment);
        LibLoan._accruedYieldCollateral(loanAccount, collateral, cYield);

        collateral.amount =
            collateral.amount -
            LibSwap._getAmountOutMin(
                LibSwap._getMarketAddress(loan.market),
                LibSwap._getMarketAddress(collateral.market),
                deductibleInterest.accruedInterest,
                2
            );
        if (_commitment == LibCommon._getCommitment(2)) collateral.amount += cYield.accruedYield;

        delete deductibleInterest.id;
        delete deductibleInterest.market;
        delete deductibleInterest.oldLengthAccruedInterest;
        delete deductibleInterest.oldTime;
        delete deductibleInterest.accruedInterest;

        //DELETING CollateralYield
        delete cYield.id;
        delete cYield.market;
        delete cYield.commitment;
        delete cYield.oldLengthAccruedYield;
        delete cYield.oldTime;
        delete cYield.accruedYield;

        // uint8 debtCategory = _getDebtCategory(loan, collateral);

        if (!_validLoanLiquidation(loanState, collateral, _getDebtCategory(loan, collateral))) {
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
        } else if (_validateLiquidator(liquidator)) {
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

            if (_getDebtCategory(loan, collateral) == 1) {
                collateral.amount = LibSwap._swap(
                    loan.market,
                    collateral.market,
                    remnantAmount - ((18 * loan.amount) / 1000),
                    2
                );

                LibReserve._updateReservesLoan(collateral.market, ((18 * loan.amount) / 1000), 0);
                console.log("protocol fee==========", ((18 * loan.amount) / 1000));
            } else if (_getDebtCategory(loan, collateral) == 2) {
                collateral.amount = LibSwap._swap(
                    loan.market,
                    collateral.market,
                    remnantAmount - ((15 * loan.amount) / 1000),
                    2
                );

                LibReserve._updateReservesLoan(collateral.market, ((15 * loan.amount) / 1000), 0);
                console.log("protocol fee==========", ((15 * loan.amount) / 1000));
            } else {
                collateral.amount = LibSwap._swap(
                    loan.market,
                    collateral.market,
                    remnantAmount - ((12 * loan.amount) / 1000),
                    2
                );

                LibReserve._updateReservesLoan(collateral.market, ((12 * loan.amount) / 1000), 0);
                console.log("protocol fee==========", ((12 * loan.amount) / 1000));
            }

            IBEP20(LibCommon._connectMarket(collateral.market)).transfer(liquidator, collateral.amount);
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

        /// LOAN STATE
        delete loanState.id;
        delete loanState.loanMarket;
        delete loanState.actualLoanAmount;
        delete loanState.currentMarket;
        delete loanState.currentAmount;
        delete loanState.state;

        return loanAmount;
    }

    function _liquidableLoans(uint256 _indexFrom)
        internal
        view
        returns (
            address[] memory,
            bytes32[] memory,
            bytes32[] memory,
            uint256[] memory,
            bytes32[] memory,
            uint256[] memory
        )
    {
        AppStorageOpen storage ds = LibCommon.diamondStorage();

        address[] memory loanOwner = new address[](100);
        bytes32[] memory loanMarket = new bytes32[](100);
        bytes32[] memory loanCommitment = new bytes32[](100);
        uint256[] memory loanAmount = new uint256[](100);
        bytes32[] memory collateralMarket = new bytes32[](100);
        uint256[] memory collateralAmount = new uint256[](100);

        uint8 pointer;

        for (uint256 i = _indexFrom; i < _indexFrom + 10; i++) {
            LoanState[] memory loanStates = ds.loanPassbook[ds.borrowers[i]].loanState;
            for (uint256 j = 0; j < loanStates.length; j++) {
                LoanRecords memory loan = ds.loanPassbook[ds.borrowers[i]].loans[j];
                CollateralRecords memory collateral = ds.loanPassbook[ds.borrowers[i]].collaterals[j];
                if (
                    loan.id != 0 && _validLoanLiquidation(loanStates[j], collateral, _getDebtCategory(loan, collateral))
                ) {
                    loanOwner[pointer] = loan.owner;
                    loanMarket[pointer] = loan.market;
                    loanCommitment[pointer] = loan.commitment;
                    loanAmount[pointer] = loan.amount;
                    collateralMarket[pointer] = collateral.market;
                    collateralAmount[pointer] = collateral.initialAmount;
                    pointer += 1;
                }
            }
        }

        return (loanOwner, loanMarket, loanCommitment, loanAmount, collateralMarket, collateralAmount);
    }
}
