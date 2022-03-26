// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import { AppStorageOpen, LibCommon, LibOracle } from "../libraries/LibOracle.sol";
import { Pausable } from "../util/Pausable.sol";
import { IOracleOpen } from "../interfaces/IOracleOpen.sol";
import { IAccessRegistry } from "../interfaces/IAccessRegistry.sol";

contract OracleOpen is Pausable, IOracleOpen {

	receive() external payable {
		payable(LibCommon.upgradeAdmin()).transfer(msg.value);
	}
	
	fallback() external payable {
		payable(LibCommon.upgradeAdmin()).transfer(msg.value);
	}

	function getLatestPrice(bytes32 _market) external view override returns (uint) {    
		return LibOracle._getLatestPrice(_market);
	}

	function getFairPrice(uint _requestId) external view override returns (uint) {
		return LibOracle._getFairPrice(_requestId);
	}

	function setFairPrice(uint _requestId, uint _fPrice, bytes32 _market, uint _amount) external authOracleOpen() returns(bool){
		LibOracle._fairPrice(_requestId, _fPrice, _market, _amount);
		return true;
	}

	function pauseOracle() external override authOracleOpen() {
			_pause();
	}
	
	function unpauseOracle() external override authOracleOpen() {
		_unpause();

	}

	function isPausedOracle() external view override virtual returns (bool) {
			return _paused();
	}

	modifier authOracleOpen() {
		AppStorageOpen storage ds = LibCommon.diamondStorage(); 
		require(IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.superAdmin, msg.sender) || IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.adminOpenOracle, msg.sender), "ERROR: Not an admin");
		_;
	}

}
