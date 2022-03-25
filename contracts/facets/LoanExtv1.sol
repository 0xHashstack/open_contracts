// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import "../libraries/LibOpen.sol";
import "../util/Pausable.sol";
import "../interfaces/ILoanExtv1.sol";

contract LoanExtv1 is Pausable, ILoanExtv1 {
	event LoanRepaid(address indexed account,uint256 indexed id,bytes32 indexed market,uint256 amount,uint256 timestamp);
	event Liquidation(address indexed account,bytes32 indexed market,bytes32 indexed commitment,uint256 amount,uint256 time);

	receive() external payable {
		payable(LibOpen.upgradeAdmin()).transfer(msg.value);
	}
	
	fallback() external payable {
		payable(LibOpen.upgradeAdmin()).transfer(msg.value);
	}

	function liquidation(address account, bytes32 _market, bytes32 _commitment) external override authLoanExtv1() nonReentrant returns (bool success) {
		uint256 amount = LibOpen._liquidation(account, _market, _commitment);
		emit Liquidation(account, _market, _commitment, amount, block.timestamp);
	}

	function repayLoan(bytes32 _loanMarket,bytes32 _commitment,uint256 _repayAmount) external override nonReentrant returns (bool) {
		AppStorageOpen storage ds = LibOpen.diamondStorage();
		LoanRecords storage loan = ds.indLoanRecords[msg.sender][_loanMarket][_commitment];
		uint256 repaymentAmount = LibOpen._repayLoan(msg.sender, _loanMarket, _commitment, _repayAmount);
		emit LoanRepaid(msg.sender, loan.id, loan.market, repaymentAmount, block.timestamp);
		return true;
	}
	function pauseLoanExtv1() external override nonReentrant authLoanExtv1() {
		_pause();
	}
		
	function unpauseLoanExtv1() external override nonReentrant authLoanExtv1() {
		_unpause();   
	}

	function isPausedLoanExtv1() external view virtual override returns (bool) {
		return _paused();
	}

	modifier authLoanExtv1() {
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		require(IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.superAdmin, msg.sender) || IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.adminLoanExtv1, msg.sender), "ERROR: Not an admin");

		_;
	}
}