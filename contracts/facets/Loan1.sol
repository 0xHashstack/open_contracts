// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import { STATE, ActiveLoans, AppStorageOpen, LibCommon, LibReserve, LibLoan, LibLoan1 } from "../libraries/LibLoan1.sol";
import { Pausable } from "../util/Pausable.sol";
import { IBEP20 } from "../util/IBEP20.sol";
import { ILoan1 } from "../interfaces/ILoan1.sol";
import { IAccessRegistry } from "../interfaces/IAccessRegistry.sol";

contract Loan1 is Pausable, ILoan1 {

	event NewLoan(address indexed account,bytes32 loanMarket,bytes32 commitment,uint256 loanAmount,bytes32 collateralMarket,uint256 collateralAmount,uint256 indexed loanId,uint256 time);

	receive() external payable {
		payable(LibCommon.upgradeAdmin()).transfer(msg.value);
	}
	
	fallback() external payable {
		payable(LibCommon.upgradeAdmin()).transfer(msg.value);
	}


	function hasLoanAccount(address _account) external view override returns (bool) {
		return LibLoan._hasLoanAccount(_account);
	}

	function avblReservesLoan(bytes32 _loanMarket) external view override returns(uint) {
		return LibReserve._avblReservesLoan(_loanMarket);
	}

	function utilisedReservesLoan(bytes32 _loanMarket) external view override returns(uint) {
    	return LibReserve._utilisedReservesLoan(_loanMarket);
	}

	function getLoans(address account) external view returns(bytes32[] memory loanMarket, bytes32[] memory loanCommitment,uint256[] memory loanAmount,bytes32[] memory collateralMarket,uint256[] memory collateralAmount,bool[] memory isSwapped,bytes32[] memory loanCurrentMarket,uint256[] memory loanCurrentAmount, uint256[] memory collateralYield,uint256[] memory borrowInterest, STATE[] memory state) {
		AppStorageOpen storage ds = LibCommon.diamondStorage(); 
		ActiveLoans storage activeLoans = ds.getActiveLoans[account];

		return (activeLoans.loanMarket, activeLoans.loanCommitment, activeLoans.loanAmount, activeLoans.collateralMarket, activeLoans.collateralAmount, activeLoans.isSwapped, activeLoans.loanCurrentMarket, activeLoans.loanCurrentAmount, activeLoans.collateralYield, activeLoans.borrowInterest, activeLoans.state);
	}

	function loanRequest(
		bytes32 _loanMarket,
		bytes32 _commitment,
		uint256 _loanAmount,
		bytes32 _collateralMarket,
		uint256 _collateralAmount
	) external override nonReentrant returns (bool) {
		uint256 loanId = LibLoan1._loanRequest(msg.sender, _loanMarket, _commitment, _loanAmount, _collateralMarket, _collateralAmount);
		emit NewLoan(msg.sender, _loanMarket, _commitment, _loanAmount, _collateralMarket, _collateralAmount, loanId, block.timestamp);
		return true;
	}

	function pauseLoan1() external override nonReentrant authLoan1() {
		_pause();
	}
		
	function unpauseLoan1() external override nonReentrant authLoan1() {
		_unpause();   
	}

	function isPausedLoan1() external view virtual override returns (bool) {
		return _paused();
	}

	modifier authLoan1() {
		AppStorageOpen storage ds = LibCommon.diamondStorage(); 
		require(IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.superAdmin, msg.sender) || IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.adminLoan1, msg.sender), "ERROR: Not an admin");

		_;
	}
}