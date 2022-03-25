// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import { AppStorageOpen, LibCommon, LibSwap, LibLiquidation } from "../libraries/LibLiquidation.sol";
import { Pausable } from "../util/Pausable.sol";
import { ILiquidator } from "../interfaces/ILiquidator.sol";
import { IAccessRegistry } from "../interfaces/IAccessRegistry.sol";

contract Liquidator is Pausable, ILiquidator {	
	event Liquidation(address indexed account,bytes32 indexed market,bytes32 indexed commitment,uint256 amount,uint256 time);

	receive() external payable {
		payable(LibCommon.upgradeAdmin()).transfer(msg.value);
	}

	fallback() external payable {
		payable(LibCommon.upgradeAdmin()).transfer(msg.value);
	}
	
	function swap(bytes32 _fromMarket, bytes32 _toMarket, uint256 _fromAmount, uint8 _mode) external override returns (uint256 receivedAmount) {
			require(_fromMarket != _toMarket, "FromToken can't be the same as ToToken.");
			receivedAmount = LibSwap._swap(_fromMarket, _toMarket, _fromAmount, _mode);
	}

	function liquidation(address account, bytes32 _market, bytes32 _commitment) external override authLiquidator() nonReentrant() returns (bool success) {
		uint256 amount = LibLiquidation._liquidation(account, _market, _commitment);
		emit Liquidation(account, _market, _commitment, amount, block.timestamp);
		return true;
	}

	function pauseLiquidator() external override authLiquidator() nonReentrant() {
			_pause();
	}
	
	function unpauseLiquidator() external override authLiquidator() nonReentrant() {
       _unpause();   
	}

    function isPausedLiquidator() external view override virtual returns (bool) {
        return _paused();
    }

	modifier authLiquidator() {
    	AppStorageOpen storage ds = LibCommon.diamondStorage(); 
		require(IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.superAdmin, msg.sender) || IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.adminLiquidator, msg.sender), "ERROR: Not an admin");
		_;
	}
}