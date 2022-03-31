// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

interface IDynamicInterest {
    function getDepositInterests(bytes32 _minOrMax) external view returns (uint256);

    function getBorrowInterests(bytes32 _minOrMax) external view returns (uint256);

    function getInterestFactors(bytes32 _factor) external view returns (uint256);

    function setDepositInterests(uint256 minDepositInterest, uint256 maxDepositInterest) external returns (bool);

    function setBorrowInterests(uint256 minBorrowInterest, uint256 maxBorrowInterest) external returns (bool);

    function setInterestFactors(uint256 offset, uint256 correlationFactor) external returns (bool);

    function updateInterests(bytes32 market) external returns (bool);

    function pauseComptroller() external;

    function unpauseComptroller() external;

    function isPausedComptroller() external view returns (bool);
}