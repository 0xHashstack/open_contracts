// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

interface ILoanExtv1 {
	// enum STATE {ACTIVE,REPAID}
    function repayLoan(bytes32 _market,bytes32 _commitment,uint256 _repayAmount) external  returns (bool);
    function liquidation(address account, bytes32 _market, bytes32 _commitment) external returns (bool success);
    function pauseLoanExtv1() external;
    function unpauseLoanExtv1() external;
    function isPausedLoanExtv1() external view returns (bool);
}