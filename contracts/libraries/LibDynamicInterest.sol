// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import "./LibCommon.sol";
import "./LibReserve.sol";
import "./LibComptroller.sol";

library LibDynamicInterest {
    function _getDepositInterests(uint256 minOrMax) internal view returns(uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.depositInterests[minOrMax];
    }

    function _getBorrowInterests(uint256 minOrMax) internal view returns(uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.borrowInterests[minOrMax];
    }

    function _getInterestFactors(uint256 factor) internal view returns(uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.interestFactors[factor];
    }

    function _setDepositInterests(uint256 minDepositInterest, uint256 maxDepositInterest) internal {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        ds.depositInterests[0] = minDepositInterest;
        ds.depositInterests[1] = maxDepositInterest;
    }

    function _setBorrowInterests(uint256 minBorrowInterest, uint256 maxBorrowInterest) internal {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        ds.borrowInterests[0] = minBorrowInterest;
        ds.borrowInterests[1] = maxBorrowInterest;
    }

    function _setInterestFactors(uint256 offset, uint256 correlationFactor) internal {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        ds.interestFactors[0] = offset;
        ds.interestFactors[1] = correlationFactor;
    }

    function _calculateDynamicInterest(bytes32 market) internal {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        
        uint utilisationFactor = (LibReserve._utilisedReservesLoan(market)*100)/LibReserve._avblReservesDeposit(market);
        if(utilisationFactor <= 25){
            for(uint i = ds.depositCommitment.length; i >= 0; i--)
                LibComptroller._updateAPY(market, ds.depositCommitment[i], 0);
            
            uint256 correlationFactor = 1;
            for(uint i = 0; i < ds.borrowCommitment.length; i++){   
                LibComptroller._updateAPR(market, ds.borrowCommitment[i], (_getBorrowInterests(0)/correlationFactor));
                correlationFactor *= _getInterestFactors(1);
            }
            return;
        }

        uint256 randomness = 80;
        if(utilisationFactor > 70){

            uint256 calculatedDepositInterest = (randomness*_getDepositInterests(1)/100)+1;
            uint256 calculatedBorrowInterest = ((calculatedDepositInterest*10000)/((100+_getInterestFactors(0))*utilisationFactor));
            if(calculatedBorrowInterest > _getBorrowInterests(1)){
                calculatedBorrowInterest = _getBorrowInterests(1);
                calculatedDepositInterest = ((((100+_getInterestFactors(0))*utilisationFactor)*calculatedBorrowInterest)/10000);
            }

            uint256 correlationFactor = 1;
            for(uint i = ds.depositCommitment.length; i >= 0; i--){
                LibComptroller._updateAPY(market, ds.depositCommitment[i], (calculatedDepositInterest/correlationFactor));
                correlationFactor *= _getInterestFactors(1);
            }

            correlationFactor = 1;
            for(uint i = 0; i < ds.borrowCommitment.length; i++){   
                LibComptroller._updateAPR(market, ds.borrowCommitment[i], (calculatedBorrowInterest/correlationFactor));
                correlationFactor *= _getInterestFactors(1);
            }
        }
        else{
            uint256 calculatedDepositInterest = (randomness*_getDepositInterests(1)/100);
            uint256 calculatedBorrowInterest = ((calculatedDepositInterest*10000)/((100+_getInterestFactors(0))*utilisationFactor));
            if(calculatedBorrowInterest > _getBorrowInterests(1)){
                calculatedBorrowInterest = _getBorrowInterests(1);
                calculatedDepositInterest = ((((100+_getInterestFactors(0))*utilisationFactor)*calculatedBorrowInterest)/10000);
            }

            uint256 correlationFactor = 1;
            for(uint i = ds.depositCommitment.length; i >= 0; i--){
                LibComptroller._updateAPY(market, ds.depositCommitment[i], (calculatedDepositInterest/correlationFactor));
                correlationFactor *= _getInterestFactors(1);
            }

            correlationFactor = 1;
            for(uint i = 0; i < ds.borrowCommitment.length; i++){   
                LibComptroller._updateAPR(market, ds.borrowCommitment[i], (calculatedBorrowInterest/correlationFactor));
                correlationFactor *= _getInterestFactors(1);
            }
        }           
    }
}