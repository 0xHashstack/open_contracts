// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;
pragma experimental ABIEncoderV2;

import "./AppStorageOpen.sol";
import "../util/Address.sol";
import "../util/IBEP20.sol";
import "../interfaces/ITokenList.sol";
import "../interfaces/IComptroller.sol";
import "../interfaces/ILiquidator.sol";
import "../interfaces/IDeposit.sol";
import "../interfaces/IReserve.sol";
import "../interfaces/ILoan.sol";
import "../interfaces/ILoanExt.sol";
import "../interfaces/IOracleOpen.sol";
import "../interfaces/IAccessRegistry.sol";
import "../interfaces/AggregatorV3Interface.sol";
import "../interfaces/IAugustusSwapper.sol";
import "../interfaces/IPancakeRouter01.sol";

import "hardhat/console.sol";

library LibOpen {
	using Address for address;

	uint8 constant TOKENLIST_ID = 10;
	uint8 constant COMPTROLLER_ID = 11;
	// uint8 constant LIQUIDATOR_ID = 12;
	uint8 constant RESERVE_ID = 13;
	// uint8 constant ORACLEOPEN_ID = 14;
	uint8 constant LOAN_ID = 15;
	uint8 constant LOANEXT_ID = 16;
	uint8 constant DEPOSIT_ID = 17; 
	// address internal constant PANCAKESWAP_ROUTER_ADDRESS = 0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3 ; // pancakeswap bsc testnet router address
	address internal constant PANCAKESWAP_ROUTER_ADDRESS = 0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3 ; // pancakeswap bsc testnet router address

	// enum STATE {ACTIVE,REPAID}
	event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

// =========== Liquidator events ===============
// =========== OracleOpen events ===============
	event FairPriceCall(uint requestId, bytes32 market, uint amount);
  	event WithdrawCollateral(
        address indexed account,
        bytes32 indexed market,
        uint256 indexed amount,
        uint256 id,
        uint256 timestamp
    );
	event MarketSwapped(address indexed account,bytes32 loanMarket,bytes32 commmitment,bool isSwapped,bytes32 indexed currentMarket,uint256 indexed currentAmount,uint256 timestamp);

	// event MarketSwapped(
	// 	address indexed account,
	// 	bytes32 loanMarket,
	// 	bytes32 commmitment,
	// 	bytes32 indexed fromMarket,
	// 	bytes32 indexed toMarket,
	// 	uint256 toAmount,
	// 	uint256 timestamp
	// );

	// event MarketSwapped(
	// 	address indexed account,
	// 	uint256 indexed loanid,
	// 	bytes32 marketFrom,
	// 	bytes32 marketTo,
	// 	uint256 amount
	// );

	function upgradeAdmin() internal view returns (address upgradeAdmin_) {
		upgradeAdmin_ = diamondStorage().upgradeAdmin;
	}

	function _addFairPriceAddress(bytes32 _loanMarket, address _address) internal {
		AppStorageOpen storage ds = diamondStorage();
		ds.pairAddresses[_loanMarket] = _address;
	}

	function _getFairPriceAddress(bytes32 _loanMarket) internal view returns (address){
		AppStorageOpen storage ds = diamondStorage();
		return ds.pairAddresses[_loanMarket];
	}

	function diamondStorage() internal pure returns (AppStorageOpen storage ds) {
		assembly {
				ds.slot := 0
		}
	}

	function _isMarketSupported(bytes32  _market) internal view {
		AppStorageOpen storage ds = diamondStorage(); 
		require(ds.tokenSupportCheck[_market] == true, "ERROR: Unsupported market");
	}

	function _getMarketAddress(bytes32 _loanMarket) internal view returns (address) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indMarketData[_loanMarket].tokenAddress;
	}

	function _getMarketDecimal(bytes32 _loanMarket) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indMarketData[_loanMarket].decimals;
	}

	function _minAmountCheck(bytes32 _loanMarket, uint _amount) internal view {
		
		AppStorageOpen storage ds = diamondStorage(); 
		MarketData memory marketData = ds.indMarketData[_loanMarket];
		
		require(marketData.minAmount <= _amount, "ERROR: Less than minimum amount");
	}

	function _isMarket2Supported(bytes32  _loanMarket) internal view {
		require(diamondStorage().token2SupportCheck[_loanMarket] == true, "Secondary Token is not supported");
	}

	function _getMarket2Address(bytes32 _loanMarket) internal view returns (address) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indMarket2Data[_loanMarket].tokenAddress;
	}

	function _getMarket2Decimal(bytes32 _loanMarket) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage();
		return ds.indMarket2Data[_loanMarket].decimals;
	}

	function _connectMarket(bytes32 _market) internal view returns (address) {
		
		AppStorageOpen storage ds = diamondStorage(); 
		MarketData memory marketData = ds.indMarketData[_market];
		return marketData.tokenAddress;
	}
	
// =========== Comptroller Functions ===========

	function _getAPR(bytes32 _commitment) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indAPRRecords[_commitment].aprChanges[ds.indAPRRecords[_commitment].aprChanges.length - 1];
	}

	function _getAPRInd(bytes32 _commitment, uint _index) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indAPRRecords[_commitment].aprChanges[_index];
	}

	function _getAPY(bytes32 _commitment) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indAPYRecords[_commitment].apyChanges[ds.indAPYRecords[_commitment].apyChanges.length - 1];
	}

	function _getAPYInd(bytes32 _commitment, uint _index) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indAPYRecords[_commitment].apyChanges[_index];
	}

	function _getApytime(bytes32 _commitment, uint _index) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indAPYRecords[_commitment].time[_index];
	}

	function _getAprtime(bytes32 _commitment, uint _index) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indAPRRecords[_commitment].time[_index];
	}

	function _getApyLastTime(bytes32 _commitment) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indAPYRecords[_commitment].time[ds.indAPYRecords[_commitment].time.length - 1];
	}

	function _getAprLastTime(bytes32 _commitment) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indAPRRecords[_commitment].time[ds.indAPRRecords[_commitment].time.length - 1];
	}

	function _getApyTimeLength(bytes32 _commitment) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indAPYRecords[_commitment].time.length;
	}

	function _getAprTimeLength(bytes32 _commitment) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.indAPRRecords[_commitment].time.length;
	}

	function _getCommitment(uint _index) internal view returns (bytes32) {
		AppStorageOpen storage ds = diamondStorage(); 
		require(_index < ds.commitment.length, "Commitment Index out of range");
		return ds.commitment[_index];
	}

	function _setCommitment(bytes32 _commitment) internal /*authContract(COMPTROLLER_ID)*/ {
		AppStorageOpen storage ds = diamondStorage();
		ds.commitment.push(_commitment);
	}

	function _calcAPR(bytes32 _commitment, uint oldLengthAccruedInterest, uint oldTime, uint aggregateInterest) internal view returns (uint, uint, uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		
		APR storage apr = ds.indAPRRecords[_commitment];

		require(oldLengthAccruedInterest > 0, "oldLengthAccruedInterest is 0");
		
		aggregateInterest =  _getLoanInterest(_commitment, oldLengthAccruedInterest, oldTime);
		// uint256 index = oldLengthAccruedInterest - 1;
		// uint256 time = oldTime;

		// // 1. apr.time.length > oldLengthAccruedInterest => there is some change.

		// if (apr.time.length > oldLengthAccruedInterest)  {

		// 	if (apr.time[index] < time) {
		// 		uint256 newIndex = index + 1;
		// 		// Convert the aprChanges to the lowest unit value.
		// 		aggregateInterest = (((apr.time[newIndex] - time) *apr.aprChanges[index])/10000)*365/(100*1000);
			
		// 		for (uint256 i = newIndex; i < apr.aprChanges.length; i++) {
		// 			uint256 timeDiff = apr.time[i + 1] - apr.time[i];
		// 			aggregateInterest += (timeDiff*apr.aprChanges[newIndex] / 10000)*365/(100*1000);
		// 		}
		// 	}
		// 	else if (apr.time[index] == time) {
		// 		for (uint256 i = index; i < apr.aprChanges.length; i++) {
		// 			uint256 timeDiff = apr.time[i + 1] - apr.time[i];
		// 			aggregateInterest += (timeDiff*apr.aprChanges[index] / 10000)*365/(100*1000);
		// 		}
		// 	}
		// } else if (apr.time.length == oldLengthAccruedInterest && block.timestamp > oldLengthAccruedInterest) {
		// 	if (apr.time[index] < time || apr.time[index] == time) {
		// 		aggregateInterest += (block.timestamp - time)*apr.aprChanges[index]/10000;
		// 		// Convert the aprChanges to the lowest unit value.
		// 		// aggregateYield = (((apr.time[newIndex] - time) *apr.aprChanges[index])/10000)*365/(100*1000);
		// 	}
		// }
		oldLengthAccruedInterest = apr.time.length;
		oldTime = block.timestamp;
		return (oldLengthAccruedInterest, oldTime, aggregateInterest);
	}

	function _calcAPY(bytes32 _commitment, uint oldLengthAccruedYield, uint oldTime, uint aggregateYield) internal view returns (uint, uint, uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		APY storage apy = ds.indAPYRecords[_commitment];

		require(oldLengthAccruedYield>0, "ERROR : oldLengthAccruedYield < 1");

		aggregateYield =  _getDepositInterest(_commitment, oldLengthAccruedYield, oldTime);
		
		// uint256 index = oldLengthAccruedYield - 1;
		// uint256 time = oldTime;
		
		// // 1. apr.time.length > oldLengthAccruedInterest => there is some change.
		// if (apy.time.length > oldLengthAccruedYield)  {

		// 	if (apy.time[index] < time) {
		// 		uint256 newIndex = index + 1;
		// 		// Convert the aprChanges to the lowest unit value.
		// 		aggregateYield = (((apy.time[newIndex] - time) *apy.apyChanges[index]) / 10000)*365/(100*1000);
			
		// 		for (uint256 i = newIndex; i < apy.apyChanges.length; i++) {
		// 			uint256 timeDiff = apy.time[i + 1] - apy.time[i];
		// 			aggregateYield += (timeDiff*apy.apyChanges[newIndex] / 10000)*365/(100*1000);
		// 		}
		// 	}
		// 	else if (apy.time[index] == time) {
		// 		for (uint256 i = index; i < apy.apyChanges.length; i++) {
		// 			uint256 timeDiff = apy.time[i + 1] - apy.time[i];
		// 			aggregateYield += (timeDiff*apy.apyChanges[index] / 10000)*365/(100*1000);
		// 		}
		// 	}
		// } else if (apy.time.length == oldLengthAccruedYield && block.timestamp > oldLengthAccruedYield) {
		// 	if (apy.time[index] < time || apy.time[index] == time) {
		// 		aggregateYield += (block.timestamp - time)*apy.apyChanges[index]/10000;
		// 		// Convert the aprChanges to the lowest unit value.
		// 		// aggregateYield = (((apr.time[newIndex] - time) *apr.aprChanges[index])/10000)*365/(100*1000);
		// 	}
		// }
		oldLengthAccruedYield = apy.time.length;
		oldTime = block.timestamp;

		return (oldLengthAccruedYield, oldTime, aggregateYield);
	}

	function _getDepositInterest(bytes32 _commitment, uint256 oldLengthAccruedYield, uint256 oldTime) internal view returns (uint256 interestFactor) {

		AppStorageOpen storage ds = diamondStorage(); 
		APY storage apy = ds.indAPYRecords[_commitment];

		uint256 index = oldLengthAccruedYield - 1;
		uint256 time = oldTime;
		uint256 aggregateYield;
		
		// 1. apr.time.length > oldLengthAccruedInterest => there is some change.
		if (apy.time.length > oldLengthAccruedYield)  {

			if (apy.time[index] < time) {
				uint256 newIndex = index + 1;
				uint256 timeDiff = block.timestamp - apy.time[apy.time.length - 1];
				if(timeDiff > 600)
					aggregateYield = (timeDiff * apy.apyChanges[index]);
			
				for (uint256 i = newIndex; i < apy.apyChanges.length; i++) {
					timeDiff = apy.time[i + 1] - apy.time[i];
					if(timeDiff > 600)
						aggregateYield += (timeDiff*apy.apyChanges[i]);
				}
			}
			else if (apy.time[index] == time) {
				for (uint256 i = index; i < apy.apyChanges.length; i++) {
					uint256 timeDiff = apy.time[i + 1] - apy.time[i];
					if(timeDiff > 600)
						aggregateYield += (timeDiff*apy.apyChanges[i]);
				}
			}
		} else if (apy.time.length == oldLengthAccruedYield && block.timestamp > time) {
			if (apy.time[index] < time || apy.time[index] == time) {
				uint256 timeDiff = block.timestamp - time;
				if(timeDiff > 600)
					aggregateYield += (timeDiff*apy.apyChanges[index]);
			}
		}
		interestFactor = aggregateYield ;
		return interestFactor;
	}

	function _getReserveFactor() internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.reserveFactor;
	}

// =========== Loan functions ==============
	function _swapLoan(address _sender,bytes32 _loanMarket,bytes32 _commitment,bytes32 _swapMarket) internal /*authContract(LOAN_ID)*/ {
        AppStorageOpen storage ds = diamondStorage(); 
        _hasLoanAccount(_sender);
		
		_isMarketSupported(_loanMarket);
		_isMarket2Supported(_swapMarket);

		LoanAccount storage loanAccount = ds.loanPassbook[_sender];
		LoanRecords storage loan = ds.indLoanRecords[_sender][_loanMarket][_commitment];
		LoanState storage loanState = ds.indLoanState[_sender][_loanMarket][_commitment];
		CollateralRecords storage collateral = ds.indCollateralRecords[_sender][_loanMarket][_commitment];
		CollateralYield storage cYield = ds.indAccruedAPY[_sender][_loanMarket][_commitment];
		ActiveLoans storage activeLoans = ds.getActiveLoans[_sender];

		require(loan.id != 0, "ERROR: No loan");
		require(loan.isSwapped == false && loanState.currentMarket == _loanMarket, "ERROR: Already swapped");

		uint256 _swappedAmount;
		uint256 num = loan.id - 1;

		_swappedAmount = _swap(_sender, loan.market, _swapMarket, loanState.currentAmount, 0);

		/// Updating LoanRecord
		loan.isSwapped = true;
		loan.lastUpdate = block.timestamp;
		
		/// Updating LoanState
		loanState.currentMarket = _swapMarket;
		loanState.currentAmount = _swappedAmount;
		

		/// Updating LoanAccount
		loanAccount.loans[num].isSwapped = true;
		loanAccount.loans[num].lastUpdate = block.timestamp;
		loanAccount.loanState[num].currentMarket = loanState.currentMarket;
		loanAccount.loanState[num].currentAmount = loanState.currentAmount;

		_accruedInterest(_sender, _loanMarket, _commitment);
		if (collateral.isCollateralisedDeposit) {
			_accruedYieldCollateral(loanAccount, collateral, cYield);
			activeLoans.collateralYield[num] = cYield.accruedYield;
		} 

		/// UPDATING ACTIVELOANS
		activeLoans.isSwapped[num] = true;
		activeLoans.loanCurrentMarket[num] = _swapMarket;
		activeLoans.loanCurrentAmount[num] = _swappedAmount;
		activeLoans.borrowInterest[num] = ds.indAccruedAPR[_sender][_loanMarket][_commitment].accruedInterest;
		
		// emit MarketSwapped(_sender,loan.market, loan.commitment, loan.isSwapped, loanState.currentMarket, loanState.currentAmount, block.timestamp);
    }

	function _getLoanInterest(bytes32 _commitment, uint256 oldLengthAccruedYield, uint256 oldTime) internal view returns (uint256 interestFactor) {
		
		AppStorageOpen storage ds = diamondStorage(); 
		APR storage apr = ds.indAPRRecords[_commitment];

		uint256 index = oldLengthAccruedYield - 1;
		uint256 time = oldTime;
		uint256 aggregateYield;
		
		// 1. apr.time.length > oldLengthAccruedInterest => there is some change.
		if (apr.time.length > oldLengthAccruedYield)  {

			if (apr.time[index] < time) {
				uint256 newIndex = index + 1;
				uint timeDiff = block.timestamp - apr.time[apr.time.length-1];
				if(timeDiff > 600)
					aggregateYield = (timeDiff *apr.aprChanges[index]);
			
				for (uint256 i = newIndex; i < apr.aprChanges.length; i++) {
					timeDiff = apr.time[i + 1] - apr.time[i];
					if(timeDiff > 600)
						aggregateYield += (timeDiff*apr.aprChanges[i]);
				}
			}
			else if (apr.time[index] == time) {
				for (uint256 i = index; i < apr.aprChanges.length; i++) {
					uint256 timeDiff = apr.time[i + 1] - apr.time[i];
					if(timeDiff > 600)
						aggregateYield += (timeDiff*apr.aprChanges[i]);
				}
			}
		} else if (apr.time.length == oldLengthAccruedYield && block.timestamp > time) {
			if (apr.time[index] < time || apr.time[index] == time) {
				uint timeDiff = (block.timestamp - time);
				if(timeDiff > 600)
					aggregateYield += (timeDiff*apr.aprChanges[index]);
			}
		}
		interestFactor = aggregateYield ;
		return interestFactor;
	}
	

	// =========== Liquidator Functions ===========
	function _swap(address sender, bytes32 _fromMarket, bytes32 _toMarket, uint256 _fromAmount, uint8 _mode) internal returns (uint256) {

		if(_fromMarket == _toMarket) return _fromAmount;
		address addrFromMarket;
		address addrToMarket;
		// bytes32 cake;
		address addrCake;
		// bytes32 cake =  ;
		
		if(_mode == 0){
			addrFromMarket = _getMarketAddress(_fromMarket);
			addrToMarket = _getMarket2Address(_toMarket);
		} else if(_mode == 1) {
			addrFromMarket = _getMarket2Address(_fromMarket);
			addrToMarket = _getMarketAddress(_toMarket);
		} else if(_mode == 2) {
			addrFromMarket = _getMarketAddress(_toMarket);
			addrToMarket = _getMarketAddress(_fromMarket);
			addrCake = _getMarket2Address(0x43414b4500000000000000000000000000000000000000000000000000000000);
			console.log("address cake is ", addrCake);
			require(addrCake != address(0), "CAKE Address can not be zero.");
		}

		require(addrFromMarket != address(0) && addrToMarket != address(0), "Swap Address can not be zero.");

		/// PARASSWAP
		// address[] memory callee = new address[](2);
		// if(_fromMarket == MARKET_WBNB) callee[0] = WBNB;
		// if(_toMarket == MARKET_WBNB) callee[1] = WBNB;
		// IBEP20(addrFromMarket).approve(0xDb28dc14E5Eb60559844F6f900d23Dce35FcaE33, _fromAmount);
		// receivedAmount = IAugustusSwapper(0x3D0Fc2b7A17d61915bcCA984B9eAA087C5486d18).swapOnUniswap(
		// 	_fromAmount, 1,
		// 	callee,
		// 	1
		// );

		

		//PancakeSwap
		// IBEP20(addrFromMarket).transferFrom(sender, address(this), _fromAmount);
		IBEP20(addrFromMarket).approve(PANCAKESWAP_ROUTER_ADDRESS, _fromAmount);

		//WBNB as other test tokens
		address[] memory path;
		// if (addrFromMarket == WBNB || addrToMarket == WBNB) {
			if (_mode != 2) {
			path = new address[](2);
			path[0] = addrFromMarket;
			path[1] = addrToMarket;
		} else {
		    path = new address[](3);
		    path[0] = addrFromMarket;
		    path[1] = addrCake;
		    path[2] = addrToMarket;
		}

// https://github.com/pancakeswap/pancake-document/blob/c3531149a4b752a0cfdf94f2d276ac119f89774b/code/smart-contracts/pancakeswap-exchange/router-v2.md#swapexacttokensfortokens
		uint[] memory ret;
		ret = IPancakeRouter01(PANCAKESWAP_ROUTER_ADDRESS).swapExactTokensForTokens(_fromAmount,_getAmountOutMin(addrFromMarket, addrToMarket, _fromAmount),path,address(this),block.timestamp+15);
		return ret[ret.length-1];
	}

	function _getAmountOutMin(
		address _tokenIn,
		address _tokenOut,
		uint _amountIn
	) private view returns (uint) {
		// bytes32 cake;
		address addrCake;
		uint _mode;
		// cake =  ;
		addrCake = _getMarket2Address(0x43414b4500000000000000000000000000000000000000000000000000000000);
		console.log("address cake is ", addrCake);
		require(addrCake != address(0), "CAKE Address can not be zero.");
		
		address[] memory path;
		//if (_tokenIn == WBNB || _tokenOut == WBNB) {
			if (_mode != 2) {
			path = new address[](2);
			path[0] = _tokenIn;
			path[1] = _tokenOut;
		} else {
		    path = new address[](3);
		    path[0] = _tokenIn;
		    path[1] = addrCake;
		    path[2] = _tokenOut;
		}

		// same length as path
		uint[] memory amountOutMins = IPancakeRouter01(PANCAKESWAP_ROUTER_ADDRESS).getAmountsOut(
				_amountIn,
				path
		);	

		return amountOutMins[path.length - 1];
  }

    function _withdrawCollateral(address _sender, bytes32 _market, bytes32 _commitment) internal {
        _hasLoanAccount(_sender);
        _isMarketSupported(_market);

        AppStorageOpen storage ds = diamondStorage();

        LoanAccount storage loanAccount = ds.loanPassbook[_sender];
        LoanRecords storage loan = ds.indLoanRecords[_sender][_market][_commitment];
        LoanState storage loanState = ds.indLoanState[_sender][_market][_commitment];
        CollateralRecords storage collateral = ds.indCollateralRecords[_sender][_market][_commitment];
		ActiveLoans storage activeLoans = ds.getActiveLoans[_sender];

        /// REQUIRE STATEMENTS - CHECKING FOR LOAN, REPAYMENT & COLLATERAL TIMELOCK.
        require(loan.id != 0, "ERROR: Loan does not exist");
        require(loanState.state == STATE.REPAID, "ERROR: Active loan");
        require((collateral.timelockValidity + collateral.activationTime) < block.timestamp, "ERROR: Active Timelock");

        ds.collateralToken = IBEP20(_connectMarket(collateral.market));
        ds.collateralToken.transfer(_sender, collateral.amount);

        bytes32 collateralMarket = collateral.market;
        uint256 collateralAmount = collateral.amount;

        emit WithdrawCollateral(
            _sender,
            collateralMarket,
            collateralAmount,
            loan.id,
            block.timestamp
        );

        /// UPDATING STORAGE RECORDS FOR LOAN
        /// COLLATERAL RECORDS
        delete collateral.id;
        delete collateral.market;
        delete collateral.commitment;
        delete collateral.amount;
        delete collateral.isCollateralisedDeposit;
        delete collateral.timelockValidity;
        delete collateral.isTimelockActivated;
        delete collateral.activationTime;


        /// LOAN STATE
        delete loanState.id;
        delete loanState.state;

        uint256 loanAccountCount = loanAccount.loans.length;
        LoanRecords memory lastLoanAccountLoan = loanAccount.loans[loanAccountCount - 1];
        loanAccount.loans[loan.id - 1] = lastLoanAccountLoan;
        loanAccount.collaterals[loan.id - 1] = loanAccount.collaterals[loanAccountCount - 1];
        loanAccount.loanState[loan.id - 1] = loanAccount.loanState[loanAccountCount - 1];
        loanAccount.accruedAPR[loan.id - 1] = loanAccount.accruedAPR[loanAccountCount - 1];
        loanAccount.accruedAPY[loan.id - 1] = loanAccount.accruedAPY[loanAccountCount - 1];
        loanAccount.loans.pop();
        loanAccount.loanState.pop();
        loanAccount.accruedAPR.pop();
        loanAccount.collaterals.pop();
        loanAccount.accruedAPY.pop();

        uint256 activeLoansCount = activeLoans.loanMarket.length;
        activeLoans.loanMarket[loan.id - 1] = activeLoans.loanMarket[activeLoansCount - 1];
        activeLoans.loanCommitment[loan.id - 1] = activeLoans.loanCommitment[activeLoansCount - 1];
        activeLoans.loanAmount[loan.id - 1] = activeLoans.loanAmount[activeLoansCount - 1];
        activeLoans.collateralMarket[loan.id - 1] = activeLoans.collateralMarket[activeLoansCount - 1];
        activeLoans.collateralAmount[loan.id - 1] = activeLoans.collateralAmount[activeLoansCount - 1];
        activeLoans.isSwapped[loan.id - 1] = activeLoans.isSwapped[activeLoansCount - 1];
        activeLoans.loanCurrentMarket[loan.id - 1] = activeLoans.loanCurrentMarket[activeLoansCount - 1];
        activeLoans.loanCurrentAmount[loan.id - 1] = activeLoans.loanCurrentAmount[activeLoansCount - 1];
        activeLoans.collateralYield[loan.id - 1] = activeLoans.collateralYield[activeLoansCount - 1];
        activeLoans.borrowInterest[loan.id - 1] = activeLoans.borrowInterest[activeLoansCount - 1];
        activeLoans.state[loan.id - 1] = activeLoans.state[activeLoansCount - 1];
        activeLoans.loanMarket.pop();
        activeLoans.loanCommitment.pop();
        activeLoans.loanAmount.pop();
        activeLoans.collateralMarket.pop();
        activeLoans.collateralAmount.pop();
        activeLoans.isSwapped.pop();
        activeLoans.loanCurrentMarket.pop();
        activeLoans.loanCurrentAmount.pop();
        activeLoans.collateralYield.pop();
        activeLoans.borrowInterest.pop();
        activeLoans.state.pop();

        LoanRecords storage lastLoan = ds.indLoanRecords[lastLoanAccountLoan.owner][lastLoanAccountLoan.market][lastLoanAccountLoan.commitment];
        lastLoan.id = loan.id;

        /// LOAN RECORDS
        delete loan.id;
        delete loan.isSwapped;
        delete loan.lastUpdate;

        _updateReservesLoan(collateralMarket, collateralAmount, 1);
    }

    function _liquidation(address account, bytes32 _market, bytes32 _commitment) internal returns(uint256) {
    	AppStorageOpen storage ds = diamondStorage(); 

		LoanAccount storage loanAccount = ds.loanPassbook[account];
		LoanState storage loanState = ds.indLoanState[account][_market][_commitment];
		LoanRecords storage loan = ds.indLoanRecords[account][_market][_commitment];
		CollateralRecords storage collateral = ds.indCollateralRecords[account][_market][_commitment];
		DeductibleInterest storage deductibleInterest = ds.indAccruedAPR[account][_market][_commitment];
		CollateralYield storage cYield = ds.indAccruedAPY[account][_market][_commitment];

		uint256 remnantAmount;
		uint num = loan.id;
		require(loan.id != 0, "ERROR: Loan does not exist");


		remnantAmount = _repaymentProcess(
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
		_updateReservesLoan(loan.market, remnantAmount,0);
		_updateReservesDeposit(collateral.market, collateral.amount,1);

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

// =========== Deposit Functions ===========
	function _hasDeposit(address _account, bytes32 _loanMarket, bytes32 _commitment) internal view returns(bool ret) {
		AppStorageOpen storage ds = diamondStorage();
		ret = ds.indDepositRecord[_account][_loanMarket][_commitment].id != 0;
		// require (ds.indDepositRecord[_account][_loanMarket][_commitment].id != 0, "ERROR: No deposit");
		// return true;
	}

	function _avblReservesDeposit(bytes32 _loanMarket) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.marketReservesDeposit[_loanMarket];
	}

	function _utilisedReservesDeposit(bytes32 _loanMarket) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.marketUtilisationDeposit[_loanMarket];
	}

	function _hasAccount(address _account) internal view {
		AppStorageOpen storage ds = diamondStorage(); 
		require(ds.savingsPassbook[_account].accOpenTime!=0, "ERROR: No savings account");
	}

	function _hasYield(YieldLedger memory yield) internal pure {
		require(yield.id !=0, "ERROR: No Yield");
	}

	function _updateReservesDeposit(bytes32 _loanMarket, uint _amount, uint _num) internal /*authContract(DEPOSIT_ID)*/ {
		AppStorageOpen storage ds = diamondStorage();
		if (_num == 0)	{
			ds.marketReservesDeposit[_loanMarket] += _amount;
		} else if (_num == 1)	{
			ds.marketReservesDeposit[_loanMarket] -= _amount;
		}
	}
	function _ensureSavingsAccount(address _account, SavingsAccount storage savingsAccount) internal {

		if (savingsAccount.accOpenTime == 0) {

			savingsAccount.accOpenTime = block.timestamp;
			savingsAccount.account = _account;
		}
	}

// =========== Loan Functions ===========

	function _loanRequest(
		address _sender,
		bytes32 _loanMarket,
		bytes32 _commitment,
		uint256 _loanAmount,
		bytes32 _collateralMarket,
		uint256 _collateralAmount
	) internal returns(uint256) {
		require(_avblMarketReserves(_loanMarket) >= _loanAmount, "ERROR: Borrow amount exceeds reserves");		
		_preLoanRequestProcess(_loanMarket,_loanAmount,_collateralMarket,_collateralAmount);

		AppStorageOpen storage ds = diamondStorage(); 
		LoanRecords storage loan = ds.indLoanRecords[msg.sender][_loanMarket][_commitment];
		require(loan.id == 0, "ERROR: Active loan");
		
		/// CONNECT MARKETS
		ds.loanToken = IBEP20(_connectMarket(_loanMarket));
		ds.collateralToken = IBEP20(_connectMarket(_collateralMarket));	

		/// TRIGGER approve() from the Web3 client
		ds.collateralToken.transferFrom(msg.sender, address(this), _collateralAmount);

		_ensureLoanAccount(_sender); // CHECK LOANACCOUNT
		_processNewLoan(_loanMarket,_commitment,_loanAmount,_collateralMarket,_collateralAmount);
		
		_updateReservesLoan(_collateralMarket,_collateralAmount, 0);
	}

	function _processNewLoan(
		bytes32 _loanMarket,
		bytes32 _commitment,
		uint256 _loanAmount,
		bytes32 _collateralMarket,
		uint256 _collateralAmount
	) internal {
		
		AppStorageOpen storage ds = diamondStorage();
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
		deductibleInterest.oldTime= block.timestamp;
		deductibleInterest.accruedInterest = 0;
		
		/// UPDATING LoanState
		loanState.id = loan.id;
		loanState.loanMarket = _loanMarket;
		loanState.actualLoanAmount = _loanAmount;
		loanState.currentMarket = _loanMarket;
		loanState.currentAmount = _loanAmount;
		loanState.state = STATE.ACTIVE;

		/// UPDATING CollateralRecords
		collateral.id= loan.id;
		collateral.market= _collateralMarket;
		collateral.commitment= _commitment;
		collateral.amount = _collateralAmount;
		
		/// UPDATING LoanAccount
		loanAccount.loans.push(loan);
		loanAccount.loanState.push(loanState);

		if (_commitment == _getCommitment(0)) {
			
			collateral.isCollateralisedDeposit = false;
			collateral.timelockValidity = 0;
			collateral.isTimelockActivated = true;
			collateral.activationTime = 0;

			/// pays 18% APR
			deductibleInterest.oldLengthAccruedInterest = _getAprTimeLength(_commitment);
			
			/// UPDATING LoanAccount 
			loanAccount.collaterals.push(collateral);
			loanAccount.accruedAPR.push(deductibleInterest);

			loanAccount.accruedAPY.push(cYield);
			activeLoans.collateralYield.push(0);

		} else if (_commitment == _getCommitment(2)) {
			
			collateral.isCollateralisedDeposit = true;
			collateral.timelockValidity = 86400;
			collateral.isTimelockActivated = false;
			collateral.activationTime = 0;

			/// 15% APR
			deductibleInterest.oldLengthAccruedInterest = _getAprTimeLength(_commitment);
			
			/// 10% APY ON COLLATERALISED DEPOSIT
			cYield.id = loanAccount.loans.length + 1;
			cYield.market = _collateralMarket;
			cYield.commitment = _getCommitment(1);
			cYield.oldLengthAccruedYield = _getApyTimeLength(_commitment);
			cYield.oldTime = block.timestamp;
			cYield.accruedYield =0;


			activeLoans.collateralYield.push(0);
			
			/// UPDATING LoanAccount 
			loanAccount.collaterals.push(collateral);
			loanAccount.accruedAPY.push(cYield);
			loanAccount.accruedAPR.push(deductibleInterest);
		}

		_updateUtilisationLoan(_loanMarket, _loanAmount, 0);
	}

	function _ensureLoanAccount(address _account) internal {
		AppStorageOpen storage ds = diamondStorage();
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
		// AppStorageOpen storage ds = diamondStorage(); 
		
		require(_loanAmount != 0,"ERROR: Zero Loan amount");
		require(_collateralAmount != 0,"ERROR: Zero collateral");
		
		/// CHECK MARKETSUPPORT
		_isMarketSupported(_loanMarket);
		_isMarketSupported(_collateralMarket);
		
		/// CHECK CDR PERMISSIBLE
		_permissibleCDR(_loanMarket,_collateralMarket,_loanAmount,_collateralAmount);

		/// CHECK MINAMOUNT FOR DEPOSITS/LOANS.
		_minAmountCheck(_loanMarket, _loanAmount);
		_minAmountCheck(_collateralMarket, _collateralAmount);
	}

	function _permissibleCDR (
		bytes32 _loanMarket,
		bytes32 _collateralMarket,
		uint256 _loanAmount,
		uint256 _collateralAmount
	) internal view {
	// emit FairPriceCall(ds.requestEventId++, _loanMarket, _loanAmount);
	// emit FairPriceCall(ds.requestEventId++, _collateralMarket, _collateralAmount);

		uint256 loanToCollateral;
		uint256 amount = _avblMarketReserves(_loanMarket) - _loanAmount ;
		require(amount > 0, "ERROR: Loan exceeds reserves");
		
		uint rF = _getReserveFactor()*_avblMarketReserves(_loanMarket);

		uint256 usdLoan = (_getLatestPrice(_loanMarket)) * _loanAmount;
		uint256 usdCollateral = (_getLatestPrice(_collateralMarket)) * _collateralAmount;

		require(_avblMarketReserves(_loanMarket) >= rF + amount, "ERROR: Minimum reserve exeception");
		require (usdLoan * 100 / usdCollateral <=300, "ERROR: Insufficient collateral");

		/// DETERMIING  cdrPermissible.
		if (_avblMarketReserves(_loanMarket) >= amount + 3*_avblMarketReserves(_loanMarket)/4)    {
				loanToCollateral = 3;
		} else     {
				loanToCollateral = 2;
		}
		require (usdLoan/usdCollateral <= loanToCollateral, "ERROR: Loan exceeds permissible CDR");
	}

/// CHECKING PERMISSIBLE WITHDRAWAL
	function _checkPermissibleWithdrawal(address account, uint256 amount, LoanAccount storage loanAccount, LoanRecords storage loan, LoanState storage loanState,CollateralRecords storage collateral,CollateralYield storage cYield) internal /*authContract(LOAN_ID)*/ {
		AppStorageOpen storage ds = diamondStorage();

		require(amount <= loanState.currentAmount, "ERROR: Amount > Loan value");
		require(loanState.currentMarket == loan.market, "ERROR: Can not withdraw secondary markets");

		_accruedInterest(account, loan.market, loan.commitment);

		uint256 collateralAvbl;
		uint256 usdCollateral;
		uint256 usdLoan;
		uint256 usdLoanCurrent;


		/// UPDATE collateralAvbl
		collateralAvbl = collateral.amount - ds.indAccruedAPR[account][loan.market][loan.commitment].accruedInterest;
		if (loan.commitment == _getCommitment(2)) {
			_accruedYieldCollateral(loanAccount, collateral, cYield);
			collateralAvbl += cYield.accruedYield;
		}

		/// FETCH USDT PRICES
		usdCollateral = _getLatestPrice(collateral.market);
		usdLoan = _getLatestPrice(loan.market);
		usdLoanCurrent = _getLatestPrice(loanState.currentMarket);

		/// Permissible withdrawal amount calculation in the loanMarket.
		// permissibleAmount = ((usdCollateral*collateralAvbl - (30*usdCollateral*collateral.amount/100))/usdLoanCurrent);
		require(((usdCollateral*collateralAvbl - (30*usdCollateral*collateral.amount/100))/usdLoanCurrent) >= (amount), "ERROR: Request exceeds funds");
		require(((usdCollateral*collateralAvbl) + (usdLoanCurrent*loanState.currentAmount) - (amount*usdLoanCurrent)) >= (109*(usdLoan*ds.indLoanRecords[account][loan.market][loan.commitment].amount)/100), "ERROR: Liquidation risk");
	}


	function _updateDebtRecords(LoanAccount storage loanAccount,LoanRecords storage loan, LoanState storage loanState, CollateralRecords storage collateral/*, DeductibleInterest storage deductibleInterest, CollateralYield storage cYield*/) private {
        AppStorageOpen storage ds = diamondStorage(); 
		uint256 num = loan.id - 1;
		bytes32 _market = loan.market;

		loan.amount = 0;
		loan.isSwapped = false;
		loan.lastUpdate = block.timestamp;
		
		loanState.currentMarket = _market;
		loanState.currentAmount = 0;
		loanState.actualLoanAmount = 0;
		loanState.state = STATE.REPAID;

		collateral.isCollateralisedDeposit = false;
		collateral.isTimelockActivated = true;
		collateral.activationTime = block.timestamp;

		delete ds.indAccruedAPY[loanAccount.account][loan.market][loan.commitment];
		delete ds.indAccruedAPR[loanAccount.account][loan.market][loan.commitment];

		/// Updating LoanPassbook
		loanAccount.loans[num].amount = 0;
		loanAccount.loans[num].isSwapped = false;
		loanAccount.loans[num].lastUpdate = block.timestamp;

		loanAccount.loanState[num].currentMarket = _market;
		loanAccount.loanState[num].currentAmount = 0;
		loanAccount.loanState[num].actualLoanAmount = 0;
		loanAccount.loanState[num].state = STATE.REPAID;
		
		loanAccount.collaterals[num].isCollateralisedDeposit = false;
		loanAccount.collaterals[num].isTimelockActivated = true;
		loanAccount.collaterals[num].activationTime = block.timestamp;

		
		delete loanAccount.accruedAPY[num];
		delete loanAccount.accruedAPR[num];
	}

	function _repaymentProcess(
		uint256 num,
		uint256 _repayAmount,
		LoanAccount storage loanAccount,
		LoanRecords storage loan,
		LoanState storage loanState,
		CollateralRecords storage collateral,
		/*loanAccount,
		loan,
		loanState,
		collateral*/
		DeductibleInterest storage deductibleInterest,
		CollateralYield storage cYield
	) internal returns(uint256) {
        // AppStorageOpen storage ds = diamondStorage();
		
		bytes32 _commitment ;
		uint256 _remnantAmount;
		uint256 _collateralAmount;

		
		_commitment = loan.commitment;
		_remnantAmount = 0;
		_collateralAmount = 0;
		
		/// convert collateral into loan market to add to the repayAmount
		_collateralAmount = collateral.amount /*- deductibleInterest.accruedInterest*/;
		if (_commitment == _getCommitment(2)) 
			_collateralAmount += cYield.accruedYield;

		_repayAmount += _swap(address(this), collateral.market, loan.market, _collateralAmount, 2);
		console.log("repay amount is %s, loanAmount is %s", _repayAmount, loan.amount);
		
		if(_repayAmount >= loan.amount)
		 	_remnantAmount = (_repayAmount - loan.amount);
		else {
			if (loanState.currentMarket == loan.market)	
				_repayAmount += loanState.currentAmount;
			else if (loanState.currentMarket != loanState.loanMarket)
				_repayAmount += _swap(address(this), loanState.currentMarket, loanState.loanMarket, loanState.currentAmount, 2);
			
			_remnantAmount = (_repayAmount - loan.amount);
		}

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
		
		// / UPDATING RECORDS IN LOANACCOUNT
		delete loanAccount.accruedAPR[num];
		delete loanAccount.accruedAPY[num];

		loanAccount.collaterals[num].isCollateralisedDeposit = false;
		loanAccount.collaterals[num].activationTime = block.timestamp;
		loanAccount.collaterals[num].isTimelockActivated = true;
		
		return _remnantAmount;
	}

	function _repayLoan(address _sender, bytes32 _loanMarket, bytes32 _commitment,uint256 _repayAmount) internal returns(uint256) /*authContract(LOANEXT_ID)*/ {
		
		require(diamondStorage().indLoanRecords[_sender][_loanMarket][_commitment].id != 0,"ERROR: No Loan");
		_accruedInterest(_sender, _loanMarket, _commitment);

		AppStorageOpen storage ds = diamondStorage();
		uint256 remnantAmount;
		
		LoanAccount storage loanAccount = ds.loanPassbook[_sender];
		LoanState storage loanState = ds.indLoanState[_sender][_loanMarket][_commitment];
		LoanRecords storage loan = ds.indLoanRecords[_sender][_loanMarket][_commitment];
		CollateralRecords storage collateral = ds.indCollateralRecords[_sender][_loanMarket][_commitment];
		DeductibleInterest storage deductibleInterest = ds.indAccruedAPR[_sender][_loanMarket][_commitment];
		CollateralYield storage cYield = ds.indAccruedAPY[_sender][_loanMarket][_commitment];
		ActiveLoans storage activeLoans = ds.getActiveLoans[_sender];
		/// TRANSFER FUNDS TO PROTOCOL FROM USER
		if (_repayAmount!= 0) {
			ds.loanToken = IBEP20(_connectMarket(_loanMarket));
			ds.loanToken.transferFrom(_sender, address(this), _repayAmount);
		}
		console.log("Repayment amount",_repayAmount);
		/// CALCULATE REMNANT AMOUNT 
		remnantAmount = _repaymentProcess(
			loan.id - 1,
			_repayAmount,
			loanAccount,
			loan,
			loanState,
			collateral,
			deductibleInterest,
			cYield
		);

		// return remnantAmount;
		/// CONVERT remnantAmount into collateralAmount
		console.log("Collateral Preswap ",collateral.amount);
		collateral.amount = _swap(address(this), loan.market, collateral.market, remnantAmount, 2);
		console.log("Collateral Postswap ",collateral.amount);
		// /// RESETTING STORAGE VALUES COMMON FOR commitment(0) & commitment(2)

		/// UPDATING LoanRecords
		console.log("Updating LoanRecords");
		delete loan.market;
		delete loan.commitment;
		delete loan.amount;
		console.log("Deleted LoanRecords");


		/// UPDATING LoanState
		delete loanState.loanMarket;
		delete loanState.actualLoanAmount;
		delete loanState.currentMarket;
		delete loanState.currentAmount;
		console.log("Deleted LoanState");


		/// UPDATING RECORDS IN LOANACCOUNT
		delete loanAccount.loans[loan.id-1].market;
		delete loanAccount.loans[loan.id-1].commitment;
		delete loanAccount.loans[loan.id-1].amount;
		console.log("Deleted LOANACCOUNT from loans struct");


		delete loanAccount.loanState[loan.id-1].loanMarket;
		delete loanAccount.loanState[loan.id-1].actualLoanAmount;
		delete loanAccount.loanState[loan.id-1].currentMarket;
		delete loanAccount.loanState[loan.id-1].currentAmount;
		console.log("Deleted LoanRecords from loanstate struct");

		/// ACTIVELOANS
		activeLoans.state[loan.id - 1] = STATE.REPAID;
		delete activeLoans.isSwapped[loan.id - 1];
		delete activeLoans.loanCurrentAmount[loan.id - 1];
		delete activeLoans.collateralYield[loan.id - 1];
		delete activeLoans.borrowInterest[loan.id - 1];

		if (_commitment == _getCommitment(2)) {
			
			/// UPDATING COLLATERAL AMOUNT IN STORAGE
			loanAccount.collaterals[loan.id-1].amount = collateral.amount;

			collateral.isCollateralisedDeposit = false;
			collateral.isTimelockActivated = true;
			collateral.activationTime = block.timestamp;
			
			/// UPDATING LoanRecords
			loan.isSwapped = false;
			loan.lastUpdate = block.timestamp;
			
			/// UPDATING LoanState
			loanState.state = STATE.REPAID;

			/// UPDATING RECORDS IN LOANACCOUNT
			loanAccount.loans[loan.id-1].isSwapped = false;
			loanAccount.loans[loan.id-1].lastUpdate = block.timestamp;

			loanAccount.loanState[loan.id-1].state = STATE.REPAID;

			loanAccount.collaterals[loan.id-1].isCollateralisedDeposit = false;
			loanAccount.collaterals[loan.id-1].activationTime = block.timestamp;
			loanAccount.collaterals[loan.id-1].isTimelockActivated = true;

			activeLoans.collateralAmount[loan.id - 1] = collateral.amount;

			_updateUtilisationLoan(loan.market, loan.amount, 1);
		}

		else {
			/// Transfer remnant collateral to the user if _commitment != _getCommitment(2)
			ds.collateralToken = IBEP20(_connectMarket(collateral.market));
			// console.log("Market connected to", collateral.market);
			ds.collateralToken.transfer(_sender, collateral.amount);
			// console.log("sender balance is ", .balanceOf(_sender)}`);
			console.log("Amount ", collateral.amount);
			
			emit WithdrawCollateral(
	            _sender,
	            collateral.market,
	            collateral.amount,
	            loan.id,
	            block.timestamp
	        );

			_updateUtilisationLoan(loan.market, loan.amount, 1);
			console.log("Utilisation updated ",loan.amount);

			/// COLLATERAL RECORDS
			delete collateral.id;
			delete collateral.market;
			delete collateral.commitment;
			delete collateral.amount;
			delete collateral.isCollateralisedDeposit;
			delete collateral.timelockValidity;
			delete collateral.isTimelockActivated;
			delete collateral.activationTime;
			console.log("Collateral deleted");

			/// LOAN STATE
			delete loanState.id;
			delete loanState.state;
			console.log("loanState.id deleted");

			uint256 loanAccountCount = loanAccount.loans.length;
			LoanRecords memory lastLoanAccountLoan = loanAccount.loans[loanAccountCount - 1];
			loanAccount.loans[loan.id - 1] = lastLoanAccountLoan;
			loanAccount.collaterals[loan.id - 1] = loanAccount.collaterals[loanAccountCount - 1];
			loanAccount.loanState[loan.id - 1] = loanAccount.loanState[loanAccountCount - 1];
			loanAccount.accruedAPR[loan.id - 1] = loanAccount.accruedAPR[loanAccountCount - 1];
			loanAccount.accruedAPY[loan.id - 1] = loanAccount.accruedAPY[loanAccountCount - 1];
			loanAccount.loans.pop();
			loanAccount.loanState.pop();
			loanAccount.accruedAPR.pop();
			loanAccount.collaterals.pop();
			loanAccount.accruedAPY.pop();

			// delete loanAccount.loans[loan.id - 1];
			// delete loanAccount.collaterals[loan.id - 1];
			// delete loanAccount.loanState[loan.id - 1];

			uint256 activeLoansCount = activeLoans.loanMarket.length;
			activeLoans.loanMarket[loan.id - 1] = activeLoans.loanMarket[activeLoansCount - 1];
			activeLoans.loanCommitment[loan.id - 1] = activeLoans.loanCommitment[activeLoansCount - 1];
			activeLoans.loanAmount[loan.id - 1] = activeLoans.loanAmount[activeLoansCount - 1];
			activeLoans.collateralMarket[loan.id - 1] = activeLoans.collateralMarket[activeLoansCount - 1];
			activeLoans.collateralAmount[loan.id - 1] = activeLoans.collateralAmount[activeLoansCount - 1];
			activeLoans.isSwapped[loan.id - 1] = activeLoans.isSwapped[activeLoansCount - 1];
			activeLoans.loanCurrentMarket[loan.id - 1] = activeLoans.loanCurrentMarket[activeLoansCount - 1];
			activeLoans.loanCurrentAmount[loan.id - 1] = activeLoans.loanCurrentAmount[activeLoansCount - 1];
			activeLoans.collateralYield[loan.id - 1] = activeLoans.collateralYield[activeLoansCount - 1];
			activeLoans.borrowInterest[loan.id - 1] = activeLoans.borrowInterest[activeLoansCount - 1];
			activeLoans.state[loan.id - 1] = activeLoans.state[activeLoansCount - 1];
			activeLoans.loanMarket.pop();
			activeLoans.loanCommitment.pop();
			activeLoans.loanAmount.pop();
			activeLoans.collateralMarket.pop();
			activeLoans.collateralAmount.pop();
			activeLoans.isSwapped.pop();
			activeLoans.loanCurrentMarket.pop();
			activeLoans.loanCurrentAmount.pop();
			activeLoans.collateralYield.pop();
			activeLoans.borrowInterest.pop();

			// delete activeLoans.collateralMarket[loan.id - 1];
			// delete activeLoans.collateralAmount[loan.id - 1];
 			// delete activeLoans.loanMarket[loan.id - 1];
 			// delete activeLoans.loanCommitment[loan.id - 1];
 			// delete activeLoans.loanAmount[loan.id - 1];
 			// delete activeLoans.loanCurrentMarket[loan.id - 1];
 			// console.log("activeLoans.id deleted");

 			// update loan id of the swapped record
 			LoanRecords storage lastLoan = ds.indLoanRecords[lastLoanAccountLoan.owner][lastLoanAccountLoan.market][lastLoanAccountLoan.commitment];
			lastLoan.id = loan.id;

			/// LOAN RECORDS
			delete loan.id;
			delete loan.isSwapped;
			delete loan.lastUpdate;
		}
		return _repayAmount;
    }

	function _swapToLoan(
  		address _account,
		bytes32 _market,
		bytes32 _commitment
    ) internal /*authContract(LOAN_ID)*/ {
        AppStorageOpen storage ds = diamondStorage(); 
		
		_hasLoanAccount(_account);
		_isMarketSupported(_market);

		LoanRecords storage loan = ds.indLoanRecords[_account][_market][_commitment];
		LoanState storage loanState = ds.indLoanState[_account][_market][_commitment];
		CollateralRecords storage collateral = ds.indCollateralRecords[_account][_market][_commitment];
		CollateralYield storage cYield = ds.indAccruedAPY[_account][_market][_commitment];
		ActiveLoans storage activeLoans = ds.getActiveLoans[_account];

		require(loan.id != 0, "ERROR: No loan");
		require(loan.isSwapped == true && loanState.currentMarket != loan.market, "ERROR: Swapped market does not exist");
		// require(loan.isSwapped == true, "Swapped market does not exist");

		_isMarket2Supported(loanState.currentMarket);

		uint256 num = loan.id - 1;
		uint256 _swappedAmount = _swap(_account, loanState.currentMarket,loan.market,loanState.currentAmount, 1);
		console.log('Secondary amount is : ', loanState.currentAmount);
		/// Updating LoanRecord
		loan.isSwapped = false;
		loan.lastUpdate = block.timestamp;

		/// updating the LoanState
		loanState.currentMarket = loan.market;
		loanState.currentAmount = _swappedAmount;

		/// Updating LoanAccount
		ds.loanPassbook[_account].loans[num].isSwapped = false;
		ds.loanPassbook[_account].loans[num].lastUpdate = block.timestamp;
		ds.loanPassbook[_account].loanState[num].currentMarket = loanState.currentMarket;
		ds.loanPassbook[_account].loanState[num].currentAmount = loanState.currentAmount;

		_accruedInterest(_account, _market, _commitment);
		if (collateral.isCollateralisedDeposit) {
			_accruedYieldCollateral(ds.loanPassbook[_account], collateral, cYield);
			activeLoans.collateralYield[num] = cYield.accruedYield;
		}

		/// UPDATING ACTIVELOANS
		activeLoans.isSwapped[num] = false;
		activeLoans.loanCurrentMarket[num] = loan.market;
		activeLoans.loanCurrentAmount[num] = _swappedAmount;
		activeLoans.borrowInterest[num] = ds.indAccruedAPR[_account][_market][_commitment].accruedInterest;

		// emit MarketSwapped(_account,loan.market, loan.commitment, loan.isSwapped, loanState.currentMarket, loanState.currentAmount, block.timestamp);
    }
	
	function _avblReservesLoan(bytes32 _loanMarket) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.marketReservesLoan[_loanMarket];
	}

	function _utilisedReservesLoan(bytes32 _loanMarket) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		return ds.marketUtilisationLoan[_loanMarket];
	}

	function _updateReservesLoan(bytes32 _loanMarket, uint256 _amount, uint256 _num) internal {
		AppStorageOpen storage ds = diamondStorage(); 
		if (_num == 0) {
			ds.marketReservesLoan[_loanMarket] += _amount;
		} else if (_num == 1) {
			ds.marketReservesLoan[_loanMarket] -= _amount;
		}
	}

	function _updateUtilisationLoan(bytes32 _loanMarket, uint256 _amount, uint256 _num) internal {
		AppStorageOpen storage ds = diamondStorage(); 
		if (_num == 0)	{
			ds.marketUtilisationLoan[_loanMarket] += _amount;
		} else if (_num == 1)	{
			// require(ds.marketUtilisationLoan[_loanMarket] >= _amount, "ERROR: Utilisation is less than amount");
			ds.marketUtilisationLoan[_loanMarket] -= _amount;
		}
	}

	function _collateralPointer(address _account, bytes32 _loanMarket, bytes32 _commitment) internal view returns (bytes32, uint) {
		AppStorageOpen storage ds = diamondStorage(); 
		
		_hasLoanAccount(_account);

		// LoanRecords storage loan = ds.indLoanRecords[_account][_loanMarket][_commitment];
		LoanState storage loanState = ds.indLoanState[_account][_loanMarket][_commitment];
		CollateralRecords storage collateral = ds.indCollateralRecords[_account][_loanMarket][_commitment];

		//require(loan.id !=0, "ERROR: No Loan");
		require(loanState.state == STATE.REPAID, "ERROR: Active loan");
		//if (_commitment != _getCommitment(0)) {
		require((collateral.timelockValidity + collateral.activationTime) >= block.timestamp, "ERROR: Timelock in progress");
		//}		
		bytes32 collateralMarket = collateral.market;
		uint collateralAmount = collateral.amount;

		return (collateralMarket, collateralAmount);
	}

	function _accruedYieldCollateral(LoanAccount storage loanAccount, CollateralRecords storage collateral, CollateralYield storage cYield) internal {
		bytes32 _commitment = cYield.commitment;
		uint256 aggregateYield;
		uint256 num = collateral.id-1;
		
		(cYield.oldLengthAccruedYield, cYield.oldTime, aggregateYield) = _calcAPY(_commitment, cYield.oldLengthAccruedYield, cYield.oldTime, aggregateYield);

		aggregateYield = (collateral.amount*aggregateYield)/(365*86400*10000);

		cYield.accruedYield += aggregateYield;
		loanAccount.accruedAPY[num].accruedYield += aggregateYield;
	}

	function _accruedInterest(address _account, bytes32 _loanMarket, bytes32 _commitment) internal /*authContract(LOAN_ID)*/ {
        AppStorageOpen storage ds = diamondStorage(); 

		// emit FairPriceCall(ds.requestEventId++, _loanMarket, ds.indLoanRecords[_account][_loanMarket][_commitment].amount);
		// emit FairPriceCall(ds.requestEventId++, ds.indCollateralRecords[_account][_loanMarket][_commitment].market, ds.indCollateralRecords[_account][_loanMarket][_commitment].amount);

		// LoanAccount storage loanAccount = ds.loanPassbook[_account];
		// LoanRecords storage loan = ds.indLoanRecords[_account][_loanMarket][_commitment];
		// DeductibleInterest storage deductibleInterest = ds.indAccruedAPR[_account][_loanMarket][_commitment];

		// require(ds.indLoanState[_account][_loanMarket][_commitment].state == STATE.ACTIVE, "ERROR: Inactive Loan");
		// require(ds.indAccruedAPR[_account][_loanMarket][_commitment].id != 0, "ERROR: APR does not exist");

		uint256 aggregateYield;
		uint256 deductibleUSDValue;
		uint256 oldLengthAccruedInterest;
		uint256 oldTime;

		(oldLengthAccruedInterest, oldTime, aggregateYield) = _calcAPR(
			ds.indLoanRecords[_account][_loanMarket][_commitment].commitment, 
			ds.indAccruedAPR[_account][_loanMarket][_commitment].oldLengthAccruedInterest,
			ds.indAccruedAPR[_account][_loanMarket][_commitment].oldTime, 
			aggregateYield);

		deductibleUSDValue = (((ds.indLoanRecords[_account][_loanMarket][_commitment].amount) * _getLatestPrice(_loanMarket)) * aggregateYield)/(365*86400*10000);
		ds.indAccruedAPR[_account][_loanMarket][_commitment].accruedInterest += deductibleUSDValue / _getLatestPrice(ds.indCollateralRecords[_account][_loanMarket][_commitment].market);
		ds.indAccruedAPR[_account][_loanMarket][_commitment].oldLengthAccruedInterest = oldLengthAccruedInterest;
		ds.indAccruedAPR[_account][_loanMarket][_commitment].oldTime = oldTime;

		ds.loanPassbook[_account].accruedAPR[ds.indLoanRecords[_account][_loanMarket][_commitment].id - 1].accruedInterest = ds.indAccruedAPR[_account][_loanMarket][_commitment].accruedInterest;
		ds.loanPassbook[_account].accruedAPR[ds.indLoanRecords[_account][_loanMarket][_commitment].id - 1].oldLengthAccruedInterest = oldLengthAccruedInterest;
		ds.loanPassbook[_account].accruedAPR[ds.indLoanRecords[_account][_loanMarket][_commitment].id - 1].oldTime = oldTime;
	}

  function _hasLoanAccount(address _account) internal view returns (bool) {
    
	AppStorageOpen storage ds = diamondStorage(); 

	require(ds.loanPassbook[_account].accOpenTime !=0, "ERROR: No Loan Account");
	return true;
  }

// =========== Reserve Functions =====================

	function _transferAnyBEP20(address _token, address _sender, address _recipient, uint256 _value) internal /*authContract(RESERVE_ID)*/ {
		// IBEP20(_token).approveFrom(_sender, address(this), _value);
	    IBEP20(_token).transferFrom(_sender, _recipient, _value);
	}

	function _avblMarketReserves(bytes32 _market) internal view returns (uint) {
		// require((_loanMarketReserves(_loanMarket) - _loanMarketUtilisation(_loanMarket)) >=0, "Mathematical error");
		// return _loanMarketReserves(_loanMarket) - _loanMarketUtilisation(_loanMarket);
		IBEP20 token = IBEP20(_connectMarket(_market));
		uint balance = token.balanceOf(address(this));

		require((_marketReserves(_market) - _marketUtilisation(_market)) >=0, "ERROR: Mathematical error");
		require(balance >= (_marketReserves(_market) - _marketUtilisation(_market)), "ERROR: Reserve imbalance");

		if (balance > (_marketReserves(_market) - _marketUtilisation(_market))) {
			return balance;
		}
		return (_marketReserves(_market) - _marketUtilisation(_market));
  }

	function _marketReserves(bytes32 _market) internal view returns (uint) {
        return _avblReservesDeposit(_market) + _avblReservesLoan(_market);
	}

	function _marketUtilisation(bytes32 _market) internal view returns (uint) {
		return _utilisedReservesDeposit(_market) + _utilisedReservesLoan(_market);
	}

// =========== OracleOpen Functions =================
	function _getLatestPrice(bytes32 _market) internal view returns (uint) {
		// Chainlink price
		AppStorageOpen storage ds = diamondStorage();

		require(ds.pairAddresses[_market] != address(0), "ERROR: Invalid pair address");
		( , int price, , , ) = AggregatorV3Interface(ds.pairAddresses[_market]).latestRoundData();
		
		uint256 priceCheck = uint256(price);
		require(priceCheck != 0, "ERROR: Latest Price Fetch Failure");
		
		return priceCheck;

		// Get price from pool with USDC
		// AppStorageOpen storage ds = diamondStorage(); 
		// address[] memory path;
		// path = new address[](2);
		// path[0] = ds.pairAddresses[_market];
		// path[1] = ds.pairAddresses[0x555344432e740000000000000000000000000000000000000000000000000000];
		// require(ds.pairAddresses[_market] != address(0), "ERROR: Invalid pair address");
		// require(path[1] != address(0), "ERROR: Invalid USDT address");

		// uint[] memory amountOut = IPancakeRouter01(PANCAKESWAP_ROUTER_ADDRESS).getAmountsOut(1, path);
		// return amountOut[1];
	}

	function _getFairPrice(uint _requestId) internal view returns (uint) {
		AppStorageOpen storage ds = diamondStorage();
		require(ds.priceData[_requestId].price != 0, "ERROR: Price fetch failure");
		
		return ds.priceData[_requestId].price;
	}

	function _fairPrice(uint _requestId, uint _fPrice, bytes32 _loanMarket, uint _amount) internal {
		AppStorageOpen storage ds = diamondStorage();
		PriceData storage newPrice = ds.priceData[_requestId];
		newPrice.market = _loanMarket;
		newPrice.amount = _amount;
		newPrice.price = _fPrice;
	}

	modifier authContract(uint _facetId) {
		require(_facetId == diamondStorage().facetIndex[msg.sig] || 
			diamondStorage().facetIndex[msg.sig] == 0, "ERROR: Unauthorised access");
		_;
	}
}
