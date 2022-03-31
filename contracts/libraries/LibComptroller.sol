// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import "./LibCommon.sol";

library LibComptroller {
    function _getAPR(bytes32 _commitment) internal view returns (uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.indAPRRecords[_commitment].aprChanges[ds.indAPRRecords[_commitment].aprChanges.length - 1];
    }

    function _getAPRInd(bytes32 _commitment, uint256 _index) internal view returns (uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.indAPRRecords[_commitment].aprChanges[_index];
    }

    function _getAPY(bytes32 _commitment) internal view returns (uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.indAPYRecords[_commitment].apyChanges[ds.indAPYRecords[_commitment].apyChanges.length - 1];
    }

    function _getAPYInd(bytes32 _commitment, uint256 _index) internal view returns (uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.indAPYRecords[_commitment].apyChanges[_index];
    }

    function _getApytime(bytes32 _commitment, uint256 _index) internal view returns (uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.indAPYRecords[_commitment].time[_index];
    }

    function _getAprtime(bytes32 _commitment, uint256 _index) internal view returns (uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.indAPRRecords[_commitment].time[_index];
    }

    function _getApyLastTime(bytes32 _commitment) internal view returns (uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.indAPYRecords[_commitment].time[ds.indAPYRecords[_commitment].time.length - 1];
    }

    function _getAprLastTime(bytes32 _commitment) internal view returns (uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.indAPRRecords[_commitment].time[ds.indAPRRecords[_commitment].time.length - 1];
    }

    function _setCommitment(
        bytes32 _commitment, /*authContract(COMPTROLLER_ID)*/
        uint _days
    ) internal {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        ds.commitment.push(_commitment);
        ds.commitmentDays[_commitment] = _days;
    }

    function _updateAPY(bytes32 market, bytes32 _commitment, uint _apy) internal{
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        APY storage apyUpdate = ds.newIndAPYRecords[market][_commitment];
        
        apyUpdate.time.push(block.timestamp);
        apyUpdate.apyChanges.push(_apy);
    }

    function _updateAPR(bytes32 market, bytes32 _commitment, uint _apr) internal{
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        APR storage aprUpdate = ds.newIndAPRRecords[market][_commitment];
        aprUpdate.time.push(block.timestamp);
        aprUpdate.aprChanges.push(_apr);
    }
}
