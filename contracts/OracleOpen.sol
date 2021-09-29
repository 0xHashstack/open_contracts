// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7 <0.9.0;

contract OracleOpen {

    bytes32 adminOpenOracle;
    address adminOpenOracleAddress;

    uint minConsensus = 2;

    struct PriceData{
        uint timestamp;
        uint price;
        bytes32 market;
        uint arrivedPrices;
        mapping(uint => uint) response;
        mapping(address => uint) nest;
    }

    event OffChainRequest (
        string url,
        bytes32 market,
        uint price
    );

    event UpdatedRequest (
        bytes32 market,
        uint price
    );

    mapping(bytes32 => PriceData) latestPrice;

    constructor() {
        adminOpenOracleAddress = msg.sender;
        //AccessRegistry.addAdmin()
    }

    function newPriceRequest (
        string memory _url,
        bytes32 _market,
        uint _price
    )
    external
    {
        PriceData storage r = latestPrice[_market];
        r.timestamp = block.timestamp;
        r.market = _market;
        r.price = _price;

        emit OffChainRequest (_url, _market, _price);
    }

    function updatedChainRequest (
        bytes32 _market,
        uint _price
    ) 
    external 
    {
        PriceData storage trackRequest = latestPrice[_market];

        //Check if the token is supported. In TokenList Contract.

        if(trackRequest.nest[msg.sender] == 1){
            trackRequest.nest[msg.sender] = 2;
            
            uint tmpI = trackRequest.arrivedPrices;
            trackRequest.response[tmpI] = _price;
            trackRequest.arrivedPrices = tmpI + 1;
            
            uint currentConsensusCount = 1;
            
            for(uint i = 0; i < tmpI; i++){
                uint a = trackRequest.response[i];
                uint b = _price;

                if(a == b){
                    currentConsensusCount++;
                    if(currentConsensusCount >= minConsensus){
                        trackRequest.price = _price;
                        
                        //Add token to TokenList Contract.

                        emit UpdatedRequest (_market, _price);
                    }
                }
            }
        }
    }

    function liquidationTrigger(
        address account, 
        bytes32 market,
        bytes32 commitment,
        uint loadId
    ) public
    {
        //Call liquidate() in Loan contract.
    }

    modifier onlyAdmin(bytes32 role, address account) {
        require(role == adminOpenOracle && account == adminOpenOracleAddress, "Not permitted account");
        _;
    }
}
