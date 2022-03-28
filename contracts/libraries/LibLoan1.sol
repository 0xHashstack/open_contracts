// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import "./LibLoan.sol";

library LibLoan1 {
    function _loanRequest(
        address _sender,
        bytes32 _loanMarket,
        bytes32 _commitment,
        uint256 _loanAmount,
        bytes32 _collateralMarket,
        uint256 _collateralAmount
    ) internal returns (uint256 loanId) {
        require(LibReserve._avblMarketReserves(_loanMarket) >= _loanAmount, "ERROR: Borrow amount exceeds reserves");
        _preLoanRequestProcess(_loanMarket, _loanAmount, _collateralMarket, _collateralAmount);

        AppStorageOpen storage ds = LibCommon.diamondStorage();
        LoanRecords storage loan = ds.indLoanRecords[msg.sender][_loanMarket][_commitment];
        require(loan.id == 0, "ERROR: Active loan");

        /// CONNECT MARKETS
        ds.loanToken = IBEP20(LibCommon._connectMarket(_loanMarket));
        ds.collateralToken = IBEP20(LibCommon._connectMarket(_collateralMarket));

        /// TRIGGER approve() from the Web3 client
        ds.collateralToken.transferFrom(msg.sender, address(this), _collateralAmount);

        _ensureLoanAccount(_sender); // CHECK LOANACCOUNT
        return _processNewLoan(_loanMarket, _commitment, _loanAmount, _collateralMarket, _collateralAmount);
    }

    function _processNewLoan(
        bytes32 _loanMarket,
        bytes32 _commitment,
        uint256 _loanAmount,
        bytes32 _collateralMarket,
        uint256 _collateralAmount
    ) internal returns (uint256 loanId) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        LoanAccount storage loanAccount = ds.loanPassbook[msg.sender];
        LoanRecords storage loan = ds.indLoanRecords[msg.sender][_loanMarket][_commitment];
        LoanState storage loanState = ds.indLoanState[msg.sender][_loanMarket][_commitment];
        CollateralRecords storage collateral = ds.indCollateralRecords[msg.sender][_loanMarket][_commitment];
        DeductibleInterest storage deductibleInterest = ds.indAccruedAPR[msg.sender][_loanMarket][_commitment];
        CollateralYield storage cYield = ds.indAccruedAPY[msg.sender][_loanMarket][_commitment];
        ActiveLoans storage activeLoans = ds.getActiveLoans[msg.sender];

        /// UPDATING LoanRecords
        loan.id = loanAccount.loans.length + 1;
        loan.market = _loanMarket;
        loan.commitment = _commitment;
        loan.amount = _loanAmount;
        loan.isSwapped = false;
        loan.lastUpdate = block.timestamp;
        loan.owner = msg.sender;
        loan.initialMarketPrice = LibOracle._getQuote(_loanMarket);

        if (loan.id == 1) {
            ds.borrowers.push(msg.sender);
        }

        /// UPDATING ACTIVELOANS RECORDS
        activeLoans.loanMarket.push(_loanMarket);
        activeLoans.loanCommitment.push(_commitment);
        activeLoans.loanAmount.push(_loanAmount);
        activeLoans.collateralMarket.push(_collateralMarket);
        activeLoans.collateralAmount.push(_collateralAmount);
        activeLoans.isSwapped.push(false);
        activeLoans.loanCurrentMarket.push(_loanMarket);
        activeLoans.loanCurrentAmount.push(_loanAmount);
        activeLoans.borrowInterest.push(0);
        activeLoans.state.push(STATE.ACTIVE);

        /// UPDATING DeductibleInterest
        deductibleInterest.id = loan.id;
        deductibleInterest.market = _collateralMarket;
        deductibleInterest.oldLengthAccruedInterest = 0;
        deductibleInterest.oldTime = block.timestamp;
        deductibleInterest.accruedInterest = 0;

        /// UPDATING LoanState
        loanState.id = loan.id;
        loanState.loanMarket = _loanMarket;
        loanState.actualLoanAmount = _loanAmount;
        loanState.currentMarket = _loanMarket;
        loanState.currentAmount = _loanAmount;
        loanState.state = STATE.ACTIVE;

        /// UPDATING CollateralRecords
        collateral.id = loan.id;
        collateral.market = _collateralMarket;
        collateral.commitment = _commitment;
        collateral.amount = _collateralAmount;
        collateral.initialAmount = _collateralAmount;

        /// UPDATING LoanAccount
        loanAccount.loans.push(loan);
        loanAccount.loanState.push(loanState);

        if (_commitment == LibCommon._getCommitment(0)) {
            collateral.isCollateralisedDeposit = false;
            collateral.timelockValidity = 0;
            collateral.isTimelockActivated = true;
            collateral.activationTime = 0;

            /// pays 18% APR
            deductibleInterest.oldLengthAccruedInterest = LibCommon._getAprTimeLength(_commitment);

            /// UPDATING LoanAccount
            loanAccount.collaterals.push(collateral);
            loanAccount.accruedAPR.push(deductibleInterest);

            loanAccount.accruedAPY.push(cYield);
            activeLoans.collateralYield.push(0);
        } else if (_commitment == LibCommon._getCommitment(2)) {
            collateral.isCollateralisedDeposit = true;
            collateral.timelockValidity = 86400;
            collateral.isTimelockActivated = false;
            collateral.activationTime = 0;

            /// 15% APR
            deductibleInterest.oldLengthAccruedInterest = LibCommon._getAprTimeLength(_commitment);

            /// 10% APY ON COLLATERALISED DEPOSIT
            cYield.id = loanAccount.loans.length + 1;
            cYield.market = _collateralMarket;
            cYield.commitment = LibCommon._getCommitment(1);
            cYield.oldLengthAccruedYield = LibCommon._getApyTimeLength(_commitment);
            cYield.oldTime = block.timestamp;
            cYield.accruedYield = 0;

            activeLoans.collateralYield.push(0);

            /// UPDATING LoanAccount
            loanAccount.collaterals.push(collateral);
            loanAccount.accruedAPY.push(cYield);
            loanAccount.accruedAPR.push(deductibleInterest);
        }

        LibReserve._updateUtilisationLoan(_loanMarket, _loanAmount, 0);
        LibReserve._updateReservesLoan(_collateralMarket, _collateralAmount, 0);

        return loan.id;
    }

    function _ensureLoanAccount(address _account) internal {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        LoanAccount storage loanAccount = ds.loanPassbook[_account];

        if (loanAccount.accOpenTime == 0) {
            loanAccount.accOpenTime = block.timestamp;
            loanAccount.account = _account;
        }
    }

    function _preLoanRequestProcess(
        bytes32 _loanMarket,
        uint256 _loanAmount,
        bytes32 _collateralMarket,
        uint256 _collateralAmount
    ) internal view {
        require(_loanAmount != 0, "ERROR: Zero Loan amount");
        require(_collateralAmount != 0, "ERROR: Zero collateral");

        /// CHECK MARKETSUPPORT
        LibCommon._isMarketSupported(_loanMarket);
        LibCommon._isMarketSupported(_collateralMarket);

        /// CHECK CDR PERMISSIBLE
        _permissibleCDR(_loanMarket, _collateralMarket, _loanAmount, _collateralAmount);

        /// CHECK MINAMOUNT FOR DEPOSITS/LOANS.
        LibCommon._minAmountCheck(_loanMarket, _loanAmount);
        LibCommon._minAmountCheck(_collateralMarket, _collateralAmount);
    }

    function _permissibleCDR(
        bytes32 _loanMarket,
        bytes32 _collateralMarket,
        uint256 _loanAmount,
        uint256 _collateralAmount
    ) internal view {
        // emit FairPriceCall(ds.requestEventId++, _loanMarket, _loanAmount);
        // emit FairPriceCall(ds.requestEventId++, _collateralMarket, _collateralAmount);

        uint256 loanToCollateral;
        uint256 amount = LibReserve._avblMarketReserves(_loanMarket) - _loanAmount;
        require(amount > 0, "ERROR: Loan exceeds reserves");

        uint256 rF = LibReserve._getReserveFactor() * LibReserve._avblMarketReserves(_loanMarket);

        uint256 usdLoan = (LibOracle._getQuote(_loanMarket)) * _loanAmount;
        uint256 usdCollateral = (LibOracle._getQuote(_collateralMarket)) * _collateralAmount;

        console.log("permissible data below");
        console.log(usdLoan);
        console.log(usdCollateral);
        console.log("permissible data above");

        require(LibReserve._avblMarketReserves(_loanMarket) >= rF + amount, "ERROR: Minimum reserve exeception");
        require((usdLoan * 100) / usdCollateral <= 300, "ERROR: Insufficient collateral");

        /// DETERMIING  cdrPermissible.
        if (
            LibReserve._avblMarketReserves(_loanMarket) >=
            amount + (3 * LibReserve._avblMarketReserves(_loanMarket)) / 4
        ) {
            loanToCollateral = 3;
        } else {
            loanToCollateral = 2;
        }
        require(usdLoan / usdCollateral <= loanToCollateral, "ERROR: Loan exceeds permissible CDR");
    }
}
