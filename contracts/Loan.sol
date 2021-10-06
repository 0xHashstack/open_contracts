// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7 <0.9.0;

import "./TokenList.sol";
import "./Comptroller.sol";
import "./Deposit.sol";
import "./Reserve.sol";
import "./util/IBEP20.sol";

contract Loan {
  bytes32 adminLoan;
  address adminLoanAddress;

  bool isReentrant = false;

  TokenList markets = TokenList(0x3E2884D9F6013Ac28b0323b81460f49FE8E5f401);
  Comptroller comptroller = Comptroller(0x3E2884D9F6013Ac28b0323b81460f49FE8E5f401);
  Deposit deposit = Deposit(0xeAc61D9e3224B20104e7F0BAD6a6DB7CaF76659B);
  Reserve reserve = Reserve(payable(0xeAc61D9e3224B20104e7F0BAD6a6DB7CaF76659B));
  IBEP20 token;

  struct LoanAccount {
    uint256 accOpenTime;
    address account;
    LoanRecords[] loans; // 2 types of loans. 3 markets intially. So, a maximum o f6 records.
    CollateralRecords[] collaterals;
    DeductibleInterest[] accruedInterest;
    CollateralYield[] accruedYield;
  }
  struct LoanRecords {
    uint256 id;
    uint256 initialLoan;
    bytes32 market;
    bytes32 commitment;
    uint256 loanAmount;
    uint256 lastUpdate;
  }

  struct CollateralRecords {
    uint256 id;
    bytes32 market;
    bytes32 commitment;
    uint256 amount;
    bool isCollateralisedDeposit;
    uint256 timelockValidity;
    bool isTimelockActivated;  // timelock duration
    uint256 activationBlock; // blocknumber when yield withdrawal request was placed.
  }
  struct CollateralYield {
    uint256 id;
    bytes32 market;
    bytes32 commitment;
    uint256 amount;
    uint oldLengthAccruedYield; // length of the APY blockNumbers array.
    uint oldBlockNum; // last recorded block num
    uint accruedYield; // accruedYield in 
    bool isTimelockActivated; // is timelockApplicalbe or not. Except the flexible deposits, the timelock is applicabel on all the deposits.
    uint timelockValidity; // timelock duration
    uint releaseAfter; // block.number(isTimelockActivated) + timelockValidity.
  }
  // DeductibleInterest{} stores the amount_ of interest deducted.
  struct DeductibleInterest {
    uint256 id; // Id of the loan the interest is being deducted for.
    bytes32 market; // market_ this yield is calculated for
    uint256 oldLengthAccruedInterest; // length of the APY blockNumbers array.
    uint256 oldBlockNum; // length of the APY blockNumbers array.
    uint256 accruedInterest;
    bool isTimelockApplicable; // accruedYield in
    bool isTimelockActivated; // is timelockApplicalbe or not. Except the flexible deposits, the timelock is applicabel on all the deposits.
    uint256 timelockValidity; // timelock duration
    uint256 timelockActivationBlock; // blocknumber when yield withdrawal request was placed.
  }

  struct SwapMarket {
    uint id;
    uint index;

    //  Implement
  }

  enum COMMITMENT{FLEXIBLE, FIXED}


  mapping(address => LoanAccount) loanPassbook;
  mapping(address => mapping(bytes32 => mapping(bytes32 => LoanRecords))) indLoanRecords;
  mapping(address => mapping(bytes32 => mapping(bytes32 => CollateralRecords))) indCollateralRecords;
  mapping(address => mapping(bytes32 => mapping(bytes32 => DeductibleInterest))) indaccruedInterest;
  mapping(address => mapping(bytes32 => mapping(bytes32 => CollateralYield))) indCollateralisedDepositRecords;

  event LoanProcessed(address indexed account,bytes32 indexed market,uint256 indexed amount,bytes32 loanCommitment,uint256 timestamp);
  event LoanRepaid(address indexed account, uint256 indexed id,  bytes32 market, uint256 indexed amount, uint256 timestamp);
  event WithdrawLoan(address indexed account, uint256 indexed id,  bytes32 market, uint256 indexed amount, uint256 timestamp);

  constructor() {
    adminLoanAddress = msg.sender;
  }

  function loanRequest(bytes32 market_,bytes32 commitment_,uint256 loanAmount_,bytes32 collateralMarket_,uint256 collateralAmount_) external nonReentrant() returns(bool success) {
      
      _preLoanRequestProcess(market_, commitment_, loanAmount_, collateral_, collateralAmount_);      
      collateral.transfer(address(reserve), collateralAmount_);

      LoanAccount storage loanAccount = loanPassbook[account_];
      LoanRecords storage loan = indLoanRecords[account_][market_][commitment_];
      CollateralRecords storage collateral = indCollateralRecords[account_][market_][commitment_];
      DeductibleInterest storage deductibleInterest = indaccruedInterest[account_][market_][commitment_];
      CollateralYield storage cYield = indCollateralisedDepositRecords[account_][market_][commitment_];
      APR storage apr = comptroller.indAPRRecords[commitment_];
      
      _ensureLoanAccount(msg.sender);
      _processLoan(msg.sender,market_,commitment_, loanAmount_, collateral_, collateralAmount_);
      
      emit LoanProcessed(msg.sender, market_,loanAmount_, commitment_, block.timetstamp);
      return bool(sucess);
      // Process the loan & update the records.
  }

  function _preLoanRequestProcess(bytes32 market_,
    bytes32 commitment_,
    uint256 loanAmount_,
    bytes32 collateralMarket_,
    uint256 collateralAmount_) internal {
      _isMarketSupported(market_, collateral_);

      IBEP20 loan;
      IBEP20 collateral;

      markets._connectMarket(market_, loanAmount_, loan);
      markets._connectMarket(collateral_, collateral_, collateral);
      _cdrCheck(loanAmount_, collateralAmount_);
    }

  function _isMarketSupported(bytes32 market_, bytes32 collateralMarket_) internal {
    require(markets.tokenSupportCheck[market_] != false && markets.tokenSupportCheck[collateral_] != false, "Unsupported market");
  }

  function _cdrCheck(uint loanAmount_, uint collateralAmount_) internal {
    // fetch the usd price of the loanAmount_, and collateralAmount.
    //   check if the collateral amount / loanAmount_ is within the permissible
    //   CDR. Permissible cdr is a determinant of reserveFactor. RF =
    //   (totalDeposits) - activeLoans.
  }

  function _connectMarkets(bytes32 market_, uint256 loanAmount_, bytes32 collateralMarket_, uint256 collateralAmount_) internal {
		MarketData storage marketData = markets.indMarketData[market_];
		marketAddress = marketData.tokenAddress;
		token = IBEP20(marketAddress);
		amount_ *= marketData.decimals;
	}


    function _processLoan(address account_, bytes32 market_,
      bytes32 commitment_,
      uint256 loanAmount_,
      bytes32 collateralMarket_,
      uint256 collateralAmount_) internal {

      // calculateAPR on comptrollerContract itself. It is safest that way.  
      // _checkActiveLoan(bytes) - checks if there is any outstandng loan for
      // the market with the same commmitment type. If yes, no need to add id.
      // If no, then the below id mechanism will come handy.
      // creating a commonID;


      // Fixed loans == TWOWEEKMCP, ONEMONTHCOMMITMENT.
      uint id;

      if (loanAccount.loans.length == 0)   {
          id = 1;
      } else if (loanAccount.loans.length != 0)    {
          id = loanAccount.loans.length + 1;
      }

      if (loan.initialLoan == 0 && commitment_ == comptroller.commitment[0]) {

        loan = LoanRecords({
          id:id,
          initialLoan: block.number,
          market: market_,
          commitment: commitment_,
          loanAmount:loanAmount_,
          lastUpdate: block.number
        });

        collateral = CollateralRecords({
          id:id,
          market:collateralMarket_,
          commitment: commitment_,
          amount: collateralAmount_,
          isCollateralisedDeposit: false,
          timelockValidity: 0,
          isTimelockActivated: true,
          activationBlock: 0
        });

        deductibleInterest = DeductibleInterest({
          id:id,
          market: collateralMarket_,
          oldLengthAccruedInterest: apr.blockNumbers.length,
          oldBlockNum:block.number,
          accruedInterest: 0,
          isTimelockApplicable: false,
          isTimelockActivated: true,
          timelockValidity: 0,
          timelockActivationBlock: block.number
        });

        loanAccount.loans.push(loan);
        loanAccount.collaterals.push(collateral);
        loanAccount.accruedYield.push(0);
        loanAccount.accruedInterest.push(deductibleInterest);

      } else if (loan.initialLoan == 0 && commitment_ == comptroller.commitment[2]) {
        /// Here the commitment is for ONEMONTH. But Yield is for TWOWEEKMCP
        loan = LoanRecords({
          id:id,
          initialLoan: block.number,
          market: market_,
          commitment: commitment_,
          loanAmount:loanAmount_,
          lastUpdate: block.number
        });

        collateral = CollateralRecords({
          id:id,
          market:collateralMarket_,
          commitment: commitment_,
          amount: collateralAmount_,
          isCollateralisedDeposit: true,
          timelockValidity: 86400,
          isTimelockActivated: false,
          activationBlock: 0
        });

        deductibleInterest = DeductibleInterest({
          id:id,
          market: collateralMarket_,
          oldLengthAccruedInterest: apr.blockNumbers.length,
          oldBlockNum:block.number,
          accruedInterest: 0,
          isTimelockActivated: false,
          timelockValidity: 86400,
          timelockActivationBlock: 0
        });

        cYield = CollateralYield({
          id:id,
          market:collateralMarket_,
          commitment: commitment_,
          amount: collateralAmount_

        });

        loanAccount.loans.push(loan);
        loanAccount.collaterals.push(collateral);
        loanAccount.accruedInterest.push(deductibleInterest);
        loanAccount.accruedYield.push(0);

      } else if (loan.initialLoan != 0)  {
        
      }

    }

    function _hasLoanAccount(address account_) internal  {
        require(loanPassbook[account_].accOpenTime!=0, "Loan account does not exist");
    }

    function _ensureLoanAccount(address account_) internal {
		// LoanAccount storage loanAccount = loanPassbook[account_];

		if (loanAccount.accOpenTime == 0) {
			loanAccount.accOpenTime = block.timestamp;
			loanAccount.account = account_;
		}
	}

  function swapLoan(bytes32 market, uint loanId,uint amount, bytes32 secondaryMarket, uint swappedAmount) external returns(bool)  {}

  function permissibleWithdrawal() external returns (bool) {}

  function _permissibleWithdrawal() internal returns (bool) {}

  function switchLoanType() external {}

  function _switchLoanType() internal {}

  function currentApr() public {}

  function _calcCdr() internal {} // performs a cdr check internally

  function repayLoan(
    bytes32 market_,
    bytes32 commitment_,
    bytes32 amount_
  ) external nonReentrant returns (bool) {}

  function _repayLoan(
    bytes32 market_,
    bytes32 commitment_,
    bytes32 amount_
  ) internal {}

  function liquidation(
    bytes32 market_,
    bytes32 commitment_,
    bytes32 amount_
  ) external nonReentrant returns (bool) {
    //   calls the liqudiate function in the liquidator contract.
  }

  function collateralRelease(uint256 loanId, uint256 amount_)
    external
    nonReentrant
  {}

  modifier nonReentrant() {
    require(isReentrant == false, "Re-entrant alert!");
    isReentrant = true;
    _;
    isReentrant = false;
  }

  modifier authLoan() {
    require(
      msg.sender == adminLoanAddress,
      "Only an admin can call this function"
    );
    _;
  }
}
