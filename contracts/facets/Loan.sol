// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import "../libraries/LibOpen.sol";
import "../util/Pausable.sol";
import "hardhat/console.sol";


contract Loan is Pausable, ILoan {
    event AddCollateral(
        address indexed account,
        uint256 indexed id,
        uint256 amount,
        uint256 timestamp
    );
    event WithdrawPartialLoan(
        address indexed account,
        uint256 indexed id,
        uint256 indexed amount,
        uint256 timestamp
    );
    event MarketSwapped(address indexed account,bytes32 loanMarket,bytes32 commmitment,bool isSwapped,bytes32 indexed currentMarket,uint256 indexed amount,uint256 timestamp);

    constructor() {
        // AppStorage storage ds = LibOpen.diamondStorage();
        // ds.adminLoanAddress = msg.sender;
        // ds.loan = ILoan(msg.sender);
    }

    receive() external payable {
        payable(LibOpen.upgradeAdmin()).transfer(msg.value);
    }

    fallback() external payable {
        payable(LibOpen.upgradeAdmin()).transfer(msg.value);
    }

    /// Swap loan to a secondary market.
    function swapLoan(
        bytes32 _loanMarket,
        bytes32 _commitment,
        bytes32 _swapMarket
    ) external override nonReentrant returns (bool) {
        
        AppStorageOpen storage ds = LibOpen.diamondStorage();
        
        LoanRecords storage loan = ds.indLoanRecords[msg.sender][_loanMarket][_commitment];
        LoanState storage loanState = ds.indLoanState[msg.sender][_loanMarket][_commitment];
        
        LibOpen._swapLoan(msg.sender, _loanMarket, _commitment, _swapMarket);
        
        emit MarketSwapped(msg.sender, loanState.loanMarket, _commitment, loan.isSwapped, loanState.currentMarket, loanState.currentAmount, block.timestamp);
        return true;
    }

    /// SwapToLoan
    function swapToLoan(bytes32 _loanMarket, bytes32 _commitment)
        external
        override
        nonReentrant
        returns (bool success)
    {
        LibOpen._swapToLoan(msg.sender, _loanMarket, _commitment);
        
        AppStorageOpen storage ds = LibOpen.diamondStorage();
        LoanRecords storage loan = ds.indLoanRecords[msg.sender][_loanMarket][_commitment];
        LoanState storage loanState = ds.indLoanState[msg.sender][_loanMarket][_commitment];
        
        emit MarketSwapped(msg.sender, loanState.loanMarket, _commitment, loan.isSwapped, loanState.currentMarket, loanState.currentAmount, block.timestamp);
        return success = true;
    }

    function withdrawCollateral(bytes32 _market, bytes32 _commitment)
        external
        override
        nonReentrant
        returns (bool)
    {
        LibOpen._withdrawCollateral(msg.sender, _market, _commitment);
        return true;
    }

    function _preAddCollateralProcess(
        bytes32 _collateralMarket,
        uint256 _collateralAmount,
        LoanRecords storage loan,
        LoanState storage loanState,
        CollateralRecords storage collateral
    ) private view {
        require(loan.id != 0, "ERROR: No loan");
        require(loanState.state == STATE.ACTIVE, "ERROR: Inactive loan");
        require(
            collateral.market == _collateralMarket,
            "ERROR: Mismatch collateral market"
        );

        LibOpen._isMarketSupported(_collateralMarket);
        // LibOpen._minAmountCheck(_collateralMarket, _collateralAmount);
    }

    function addCollateral(
        bytes32 _loanMarket,
        bytes32 _commitment,
        uint256 _collateralAmount
    ) external override returns (bool) {
        AppStorageOpen storage ds = LibOpen.diamondStorage();
        LoanAccount storage loanAccount = ds.loanPassbook[msg.sender];
        LoanRecords storage loan = ds.indLoanRecords[msg.sender][_loanMarket][_commitment];
        LoanState storage loanState = ds.indLoanState[msg.sender][_loanMarket][_commitment];
        CollateralRecords storage collateral = ds.indCollateralRecords[msg.sender][_loanMarket][_commitment];
        CollateralYield storage cYield = ds.indAccruedAPY[msg.sender][_loanMarket][_commitment];
        ActiveLoans storage activeLoans = ds.getActiveLoans[msg.sender];

        _preAddCollateralProcess(
            collateral.market,
            _collateralAmount,
            loan,
            loanState,
            collateral
        );

        ds.collateralToken = IBEP20(LibOpen._connectMarket(collateral.market));

        /// TRIGGER: ds.collateralToken.approve() on the client.
        ds.collateralToken.transferFrom(
            msg.sender,
            address(this),
            _collateralAmount
        );
        LibOpen._updateReservesLoan(collateral.market, _collateralAmount, 0);

        /// UPDATE COLLATERAL IN STORAGE
        collateral.amount += _collateralAmount;
        loanAccount.collaterals[loan.id - 1].amount += _collateralAmount;
        activeLoans.collateralAmount[loan.id - 1] += _collateralAmount; // updating activeLoans

        LibOpen._accruedInterest(msg.sender, _loanMarket, _commitment);
        if (collateral.isCollateralisedDeposit)
            LibOpen._accruedYieldCollateral(loanAccount, collateral, cYield);

        emit AddCollateral(
            msg.sender,
            loan.id,
            _collateralAmount,
            block.timestamp
        );
        return true;
    }

    function withdrawPartialLoan(
        bytes32 _loanMarket,
        bytes32 _commitment,
        uint256 _amount
    ) external override nonReentrant returns (bool) {
        AppStorageOpen storage ds = LibOpen.diamondStorage();
        LibOpen._hasLoanAccount(msg.sender);

        LoanAccount storage loanAccount = ds.loanPassbook[msg.sender];
        LoanRecords storage loan = ds.indLoanRecords[msg.sender][_loanMarket][_commitment];
        LoanState storage loanState = ds.indLoanState[msg.sender][_loanMarket][_commitment];
        CollateralRecords storage collateral = ds.indCollateralRecords[msg.sender][_loanMarket][_commitment];
        CollateralYield storage cYield = ds.indAccruedAPY[msg.sender][_loanMarket][_commitment];
		ActiveLoans storage activeLoans = ds.getActiveLoans[msg.sender];

        LibOpen._checkPermissibleWithdrawal(
            msg.sender,
            _amount,
            loanAccount,
            loan,
            loanState,
            collateral,
            cYield
        );

		loanState.currentAmount -= _amount;
		activeLoans.loanCurrentAmount[loan.id - 1] -= _amount;

        ds.loanToken = IBEP20(LibOpen._connectMarket(loan.market));
        ds.loanToken.transfer(msg.sender, _amount);

        emit WithdrawPartialLoan(msg.sender, loan.id, _amount, block.timestamp);
        // emit WithdrawPartialLoan(msg.sender, loan.id, _amount, loan.market, block.timestamp);
        return true;
    }

    function getLoanInterest(address account, uint256 id) external view returns(uint256 loanInterest, uint collateralInterest)	{
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		
        ActiveLoans memory activeLoans = ds.getActiveLoans[account];
		bytes32 market = activeLoans.loanMarket[id-1];
		bytes32 commitment = activeLoans.loanCommitment[id-1];
		uint256 interestFactor = 0;
        uint256 collateralInterestFactor = 0;

		LoanRecords memory loan = ds.indLoanRecords[account][market][commitment];
		DeductibleInterest memory yield = ds.indAccruedAPR[account][market][commitment];
        CollateralYield memory cYield = ds.indAccruedAPY[account][market][commitment];
        
		interestFactor = LibOpen._getLoanInterest(commitment, yield.oldLengthAccruedInterest, yield.oldTime);
        if(commitment != LibOpen._getCommitment(0)){
            collateralInterestFactor = LibOpen._getDepositInterest(commitment, cYield.oldLengthAccruedYield, cYield.oldTime);
            collateralInterest = cYield.accruedYield;
            collateralInterest += ((collateralInterestFactor*(ds.indCollateralRecords[account][market][commitment]).amount)/(365*86400*10000));
        }
        loanInterest = yield.accruedInterest;
		loanInterest += ((interestFactor*loan.amount)/(365*86400*10000));	
		return (loanInterest, collateralInterest);

	}

    function pauseLoan() external override authLoan nonReentrant {
        _pause();
    }

    function unpauseLoan() external override authLoan nonReentrant {
        _unpause();
    }

    function isPausedLoan() external view virtual override returns (bool) {
        return _paused();
    }

    modifier authLoan() {
        AppStorageOpen storage ds = LibOpen.diamondStorage();
        require(
            IAccessRegistry(ds.superAdminAddress).hasAdminRole(
                ds.superAdmin,
                msg.sender
            ) ||
                IAccessRegistry(ds.superAdminAddress).hasAdminRole(
                    ds.adminLoan,
                    msg.sender
                ),
            "ERROR: Not an admin"
        );
        _;
    }
}
