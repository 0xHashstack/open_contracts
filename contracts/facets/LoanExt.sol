// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import "../libraries/LibOpen.sol";
import "../util/Pausable.sol";
import "../interfaces/ILoanExt.sol";
import "hardhat/console.sol";

contract LoanExt is Pausable, ILoanExt {

	event NewLoan(address indexed account,bytes32 loanMarket,bytes32 commitment,uint256 loanAmount,bytes32 collateralMarket,uint256 collateralAmount,uint256 indexed loanId,uint256 time);

	receive() external payable {
		payable(LibOpen.upgradeAdmin()).transfer(msg.value);
	}
	
	fallback() external payable {
		payable(LibOpen.upgradeAdmin()).transfer(msg.value);
	}


	function hasLoanAccount(address _account) external view override returns (bool) {
		return LibOpen._hasLoanAccount(_account);
	}

	function avblReservesLoan(bytes32 _loanMarket) external view override returns(uint) {
		return LibOpen._avblReservesLoan(_loanMarket);
	}

	function utilisedReservesLoan(bytes32 _loanMarket) external view override returns(uint) {
    	return LibOpen._utilisedReservesLoan(_loanMarket);
	}

	function getLoans(address account) external view returns(bytes32[] memory loanMarket, bytes32[] memory loanCommitment,uint256[] memory loanAmount,bytes32[] memory collateralMarket,uint256[] memory collateralAmount,bool[] memory isSwapped,bytes32[] memory loanCurrentMarket,uint256[] memory loanCurrentAmount, uint256[] memory collateralYield,uint256[] memory borrowInterest, STATE[] memory state) {
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		ActiveLoans storage activeLoans = ds.getActiveLoans[account];

		return (activeLoans.loanMarket, activeLoans.loanCommitment, activeLoans.loanAmount, activeLoans.collateralMarket, activeLoans.collateralAmount, activeLoans.isSwapped, activeLoans.loanCurrentMarket, activeLoans.loanCurrentAmount, activeLoans.collateralYield, activeLoans.borrowInterest, activeLoans.state);
	}

	function loanRequest(
		bytes32 _loanMarket,
		bytes32 _commitment,
		uint256 _loanAmount,
		bytes32 _collateralMarket,
		uint256 _collateralAmount
	) external override nonReentrant() returns (bool) {
		uint256 loanId = LibOpen._loanRequest(msg.sender, _loanMarket, _commitment, _loanAmount, _collateralMarket, _collateralAmount);
		emit NewLoan(msg.sender, _loanMarket, _commitment, _loanAmount, _collateralMarket, _collateralAmount, loanId, block.timestamp);
		return true;
	}

	function pauseLoanExt() external override authLoanExt() nonReentrant() {
		_pause();
	}
		
	function unpauseLoanExt() external override authLoanExt() nonReentrant() {
		_unpause();   
	}

	function isPausedLoanExt() external view virtual override returns (bool) {
		return _paused();
	}

	modifier authLoanExt() {
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		require(IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.superAdmin, msg.sender) || IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.adminLoanExt, msg.sender), "ERROR: Not an admin");

		_;
	}
}