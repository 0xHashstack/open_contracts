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
        bytes32 _commitment /*authContract(COMPTROLLER_ID)*/
    ) internal {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        ds.commitment.push(_commitment);
    }
}
