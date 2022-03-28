// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import "./LibCommon.sol";
import "./LibSwap.sol";
import { AggregatorV3Interface } from "../interfaces/AggregatorV3Interface.sol";

library LibOracle {
    function _getLatestPrice(bytes32 _market) internal view returns (uint256) {
        // Chainlink price
        AppStorageOpen storage ds = LibCommon.diamondStorage();

        require(ds.pairAddresses[_market] != address(0), "ERROR: Invalid pair address");
        (, int256 price, , , ) = AggregatorV3Interface(ds.pairAddresses[_market]).latestRoundData();

        uint256 priceCheck = uint256(price);
        require(priceCheck != 0, "ERROR: Latest Price Fetch Failure");

        return priceCheck;
    }

    function _getQuote(bytes32 _market) internal view returns (uint256) {
        uint256 _amountIn = 10**LibCommon._getMarketDecimal(_market);
        address marketAddress = LibSwap._getMarketAddress(_market);
        if (marketAddress == address(0)) {
            marketAddress = LibSwap._getMarket2Address(_market);
        }
        return
            LibSwap._getAmountOutMin(
                marketAddress,
                LibSwap._getMarketAddress(0x555344432e740000000000000000000000000000000000000000000000000000),
                _amountIn,
                2
            );
    }

    function _getFairPrice(uint256 _requestId) internal view returns (uint256) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        require(ds.priceData[_requestId].price != 0, "ERROR: Price fetch failure");

        return ds.priceData[_requestId].price;
    }

    function _fairPrice(
        uint256 _requestId,
        uint256 _fPrice,
        bytes32 _loanMarket,
        uint256 _amount
    ) internal {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        PriceData storage newPrice = ds.priceData[_requestId];
        newPrice.market = _loanMarket;
        newPrice.amount = _amount;
        newPrice.price = _fPrice;
    }

    function _addFairPriceAddress(bytes32 _loanMarket, address _address) internal {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        ds.pairAddresses[_loanMarket] = _address;
    }

    function _getFairPriceAddress(bytes32 _loanMarket) internal view returns (address) {
        AppStorageOpen storage ds = LibCommon.diamondStorage();
        return ds.pairAddresses[_loanMarket];
    }
}
