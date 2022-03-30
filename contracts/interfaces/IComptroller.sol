// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

interface IComptroller {
    function getAPR(bytes32 commitment_) external view returns (uint256);

    function getAPRInd(bytes32 _commitment, uint256 index) external view returns (uint256);

    function getAPY(bytes32 _commitment) external view returns (uint256);

    function getAPYInd(bytes32 _commitment, uint256 _index) external view returns (uint256);

    function getApytime(bytes32 _commitment, uint256 _index) external view returns (uint256);

    function getAprtime(bytes32 _commitment, uint256 _index) external view returns (uint256);

    function getApyLastTime(bytes32 commitment_) external view returns (uint256);

    function getAprLastTime(bytes32 commitment_) external view returns (uint256);

    function getApyTimeLength(bytes32 commitment_) external view returns (uint256);

    function getAprTimeLength(bytes32 commitment_) external view returns (uint256);

    function getCommitment(uint256 index_) external view returns (bytes32);

    function setCommitment(bytes32 _commitment) external;

    function updateAPY(bytes32 _commitment, uint256 _apy) external returns (bool);

    function updateAPR(bytes32 _commitment, uint256 _apr) external returns (bool);

    function updateLoanIssuanceFees(uint256 fees) external returns (bool success);

    function updateLoanClosureFees(uint256 fees) external returns (bool success);

    function updateLoanPreClosureFees(uint256 fees) external returns (bool success);

    function updateDepositPreclosureFees(uint256 fees) external returns (bool success);

    function updateWithdrawalFees(uint256 fees) external returns (bool success);

    function updateCollateralReleaseFees(uint256 fees) external returns (bool success);

    function updateYieldConversion(uint256 fees) external returns (bool success);

    function updateMarketSwapFees(uint256 fees) external returns (bool success);

    function updateReserveFactor(uint256 _reserveFactor) external returns (bool success);

    function updateMaxWithdrawal(uint256 factor, uint256 blockLimit) external returns (bool success);

    function getReserveFactor() external view returns (uint256);

    function pauseComptroller() external;

    function unpauseComptroller() external;

    function isPausedComptroller() external view returns (bool);

    function depositPreClosureFees() external view returns (uint256);

    function depositWithdrawalFees() external view returns (uint256);

    function collateralReleaseFees() external view returns (uint256);
}
