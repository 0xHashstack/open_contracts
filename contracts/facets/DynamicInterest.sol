// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import { AppStorageOpen, LibCommon, LibDynamicInterest } from "../libraries/LibDynamicInterest.sol";
import { LibReserve } from "../libraries/LibReserve.sol";
import { Pausable } from "../util/Pausable.sol";
import { IDynamicInterest } from "../interfaces/IDynamicInterest.sol";
import { IAccessRegistry } from "../interfaces/IAccessRegistry.sol";

contract DynamicInterest is Pausable, IDynamicInterest {

    event DepositInterestUpdated(address indexed admin, uint256 minDepositInterest, uint256 maxDepositInterest, uint256 indexed timestamp);
    event BorrowInterestUpdated(address indexed admin, uint256 minBorrowInterest, uint256 maxBorrowInterest, uint256 indexed timestamp);
    event InterestFactorsUpdated(address indexed admin, uint256 factor, uint256 correlationFactor, uint256 indexed timestamp);
    event InterestsUpdated(address indexed admin, uint256 indexed timestamp);

    // getter Methods
    function getDepositInterests(bytes32 _minOrMax) external view override returns (uint256) {
        return LibDynamicInterest._getDepositInterests(_minOrMax);
    }

    function getBorrowInterests(bytes32 _minOrMax) external view override returns (uint256) {
        return LibDynamicInterest._getBorrowInterests(_minOrMax);
    }

    function getInterestFactors(bytes32 _factor) external view override returns (uint256) {
        return LibDynamicInterest._getInterestFactors(_factor);
    }

    // setter methods
    function setDepositInterests(uint256 minDepositInterest, uint256 maxDepositInterest) external override authDynamicInterest returns (bool){
        LibDynamicInterest._setDepositInterests(minDepositInterest, maxDepositInterest);
        emit DepositInterestUpdated(msg.sender, minDepositInterest, maxDepositInterest, block.timestamp);
        return true;
    }

    function setBorrowInterests(uint256 minBorrowInterest, uint256 maxBorrowInterest) external override authDynamicInterest returns (bool){
        LibDynamicInterest._setBorrowInterests(minBorrowInterest, maxBorrowInterest);
        emit BorrowInterestUpdated(msg.sender, minBorrowInterest, maxBorrowInterest, block.timestamp);
        return true;
    }

    function setInterestFactors(uint256 offset, uint256 correlationFactor) external override authDynamicInterest returns (bool){
        LibDynamicInterest._setInterestFactors(offset, correlationFactor);
        emit InterestFactorsUpdated(msg.sender, offset, correlationFactor, block.timestamp);
        return true;
    }

    function updateInterests(bytes32 market) external override authDynamicInterest returns (bool){
        LibDynamicInterest._calculateDynamicInterest(market);
        emit InterestsUpdated(msg.sender, block.timestamp);
        return true;
    }

    modifier authDynamicInterest() {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        require(
            IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.superAdmin, msg.sender) ||
                IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.adminDynamicInterest, msg.sender),
            "ERROR: Not an admin"
        );
        _;
    }

    function pauseComptroller() external override authDynamicInterest {
        _pause();
    }

    function unpauseComptroller() external override authDynamicInterest {
        _unpause();
    }

    function isPausedComptroller() external view virtual override returns (bool) {
        return _paused();
    }
}