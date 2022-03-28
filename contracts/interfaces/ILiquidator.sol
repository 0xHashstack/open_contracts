// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

// import "./IAugustusSwapper.sol";
// import "./ITokenList.sol";

interface ILiquidator {
    function swap(
        bytes32 _fromMarket,
        bytes32 _toMarket,
        uint256 _fromAmount,
        uint8 mode
    ) external returns (uint256 receivedAmount);

    function liquidation(
        address account,
        bytes32 _market,
        bytes32 _commitment
    ) external returns (bool success);

    function liquidableLoans(uint256 _indexFrom, uint256 _indexTo)
        external
        view
        returns (
            bytes32[] memory loanMarket,
            bytes32[] memory loanCommitment,
            uint256[] memory loanAmount,
            bytes32[] memory collateralMarket,
            uint256[] memory collateralAmount
        );

    function pauseLiquidator() external;

    function unpauseLiquidator() external;

    function isPausedLiquidator() external view returns (bool);
}
