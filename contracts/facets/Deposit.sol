// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import "../util/Pausable.sol";
// import "./mockup/IMockBep20.sol";
import "../libraries/LibOpen.sol";

import "hardhat/console.sol";

contract Deposit is Pausable, IDeposit{

	event NewDeposit(address indexed account,bytes32 indexed market,bytes32 commitment,uint256 indexed amount, uint256 depositId, uint time);
	event DepositAdded(address indexed account,bytes32 indexed market,bytes32 commitment,uint256 indexed amount, uint256 depositId, uint time);
	event DepositWithdrawal(address indexed account, uint256 depositId, uint256 indexed amount,uint timestamp);
	
	constructor() 
	{
    // AppStorage storage ds = LibOpen.diamondStorage(); 
		// ds.adminDepositAddress = msg.sender;
		// ds.deposit = IDeposit(msg.sender);
	}

	receive() external payable {
		payable(LibOpen.upgradeAdmin()).transfer(msg.value);
	}
	
	fallback() external payable {
		payable(LibOpen.upgradeAdmin()).transfer(msg.value);
	}

	function hasAccount(address _account) external view override returns(bool){
		LibOpen._hasAccount(_account);
		return true;
	}

	function getDeposits(address account) external view returns(bytes32[] memory market, bytes32[] memory commitment, uint256[] memory amount, uint256[] memory savingsInterest)	{
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		ActiveDeposits storage activeDeposits = ds.getActiveDeposits[account];

		return (activeDeposits.market, activeDeposits.commitment, activeDeposits.amount, activeDeposits.savingsInterest);
	}


	function getDepositInterest(address account, uint256 id) external view returns(uint256 interest)	{
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		uint256 num = id -1;
		
		ActiveDeposits storage activeDeposits = ds.getActiveDeposits[account];
		
		bytes32 market = activeDeposits.market[num];
		bytes32 commitment = activeDeposits.commitment[num];
		uint256 interestFactor = 0;
		uint256 depositInterest;

		DepositRecords storage deposit = ds.indDepositRecord[account][market][commitment];
		YieldLedger storage yield = ds.indYieldRecord[account][market][commitment];

		interestFactor = LibOpen._getDepositInterest(commitment, yield.oldLengthAccruedYield, yield.oldTime);

		depositInterest = yield.accruedYield;
		depositInterest += ((interestFactor*deposit.amount)/(365*86400*10000));		

		return depositInterest;

	}
	function hasDeposit(bytes32 _market, bytes32 _commitment) external view override returns(bool) {
		LibOpen._hasDeposit(msg.sender,_market, _commitment);
		return true;
	}

	function hasYield(bytes32 _market, bytes32 _commitment) external view override returns(bool) {
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		YieldLedger storage yield = ds.indYieldRecord[msg.sender][_market][_commitment];
		LibOpen._hasYield(yield);
		return true;
	}
 
	function avblReservesDeposit(bytes32 _market) external view override returns(uint) {
		return LibOpen._avblReservesDeposit(_market);
	}

	function utilisedReservesDeposit(bytes32 _market) external view override returns(uint) {
    	return LibOpen._utilisedReservesDeposit(_market);
	}


/// CREATE DEPOSIT
	function depositRequest(bytes32 _market, bytes32 _commitment, uint _amount) external override nonReentrant() returns(bool) {
        AppStorageOpen storage ds = LibOpen.diamondStorage(); 

        preDepositProcess(_market, _amount);

        if (!LibOpen._hasDeposit(msg.sender, _market, _commitment))    {
            _createNewDeposit(msg.sender, _market, _commitment, _amount);
            return true;
        }
        // ds.token.approveFrom(msg.sender, address(this), _amount);
        ds.token.transferFrom(msg.sender, address(this), _amount); // change the address(this) to the diamond address.
        _processDeposit(msg.sender, _market, _commitment, _amount);

		LibOpen._updateReservesDeposit(_market, _amount, 0);
		emit DepositAdded(msg.sender, _market, _commitment, _amount, ds.indDepositRecord[msg.sender][_market][_commitment].id, block.timestamp);
        return true;
    }


/// WITHRAW DEPOSIT
	function withdrawDeposit (
		bytes32 _market, 
		bytes32 _commitment,
		uint _amount
	) external override nonReentrant() returns(bool) 
	{
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		
		LibOpen._hasAccount(msg.sender);// checks if user has savings account 
		LibOpen._isMarketSupported(_market);
		
		SavingsAccount storage savingsAccount = ds.savingsPassbook[msg.sender];
		DepositRecords storage deposit = ds.indDepositRecord[msg.sender][_market][_commitment];
		ActiveDeposits storage activeDeposits = ds.getActiveDeposits[msg.sender];

		_convertYield(msg.sender, _market, _commitment);
		require(deposit.amount >= _amount, "ERROR: Insufficient balance");

		if (_commitment != LibOpen._getCommitment(0))	{
			if (deposit.isTimelockActivated == false)	{
				deposit.isTimelockActivated = true;
				deposit.activationTime = block.timestamp;
				deposit.lastUpdate = block.timestamp;

				savingsAccount.deposits[deposit.id -1].isTimelockActivated = true;
				savingsAccount.deposits[deposit.id -1].activationTime = block.timestamp;
				savingsAccount.deposits[deposit.id -1].lastUpdate = block.timestamp;
			}
			require(deposit.activationTime + deposit.timelockValidity <= block.timestamp, "ERROR: Active timelock");
		} 
		ds.token = IBEP20(LibOpen._connectMarket(_market));
		require(_amount >= 0, "ERROR: You cannot transfer 0 amount");
		ds.token.transfer(msg.sender, _amount);

		deposit.amount -= _amount;
		savingsAccount.deposits[deposit.id -1].amount -= _amount;

		activeDeposits.amount[deposit.id-1] -= _amount;
		activeDeposits.savingsInterest[deposit.id-1] = 0;

		LibOpen._updateReservesDeposit(_market, _amount, 1);
		emit DepositWithdrawal(msg.sender,deposit.id, _amount,  block.timestamp);
		return true;
	}

    function _createNewDeposit(address _sender, bytes32 _market,bytes32 _commitment,uint256 _amount) private {
        AppStorageOpen storage ds = LibOpen.diamondStorage(); 

        SavingsAccount storage savingsAccount = ds.savingsPassbook[_sender];
        DepositRecords storage deposit = ds.indDepositRecord[_sender][_market][_commitment];
        YieldLedger storage yield = ds.indYieldRecord[_sender][_market][_commitment];
		ActiveDeposits storage activeDeposits = ds.getActiveDeposits[_sender];

        LibOpen._ensureSavingsAccount(_sender,savingsAccount);

		console.log("createNewDeposit/address(this) is %s", address(this));

        ds.token.transferFrom(_sender, address(this), _amount);

        _processNewDeposit(_market, _commitment, _amount, savingsAccount, deposit, yield, activeDeposits);
        LibOpen._updateReservesDeposit(_market, _amount, 0);
        emit NewDeposit(_sender, _market, _commitment, _amount, deposit.id, block.timestamp);
    }

	function _processNewDeposit(
		// address _account,
		bytes32 _market,
		bytes32 _commitment,
		uint256 _amount,
		SavingsAccount storage savingsAccount,
		DepositRecords storage deposit,
		YieldLedger storage yield,
		ActiveDeposits storage activeDeposits
	) private {
		// SavingsAccount storage savingsAccount = savingsPassbook[_account];
		// DepositRecords storage deposit = indDepositRecord[_account][_market][_commitment];
		// YieldLedger storage yield = indYieldRecord[_account][_market][_commitment];

		uint id;

		if (savingsAccount.deposits.length == 0) {
			id = 1;
		} else {
			id = savingsAccount.deposits.length + 1;
		}

		deposit.id = id;	
		deposit.market =_market;
		deposit.commitment = _commitment;
		deposit.amount = _amount;
		deposit.lastUpdate =  block.timestamp;

		
		if (_commitment != LibOpen._getCommitment(0)) {
			yield.id = id;
			yield.market = bytes32(_market);
			yield.oldLengthAccruedYield = LibOpen._getApyTimeLength(_commitment);
			yield.oldTime = block.timestamp;
			yield.accruedYield = 0;
			deposit.isTimelockApplicable = true;
			deposit.isTimelockActivated = false;
			deposit.timelockValidity = 86400;
			deposit.activationTime = 0;
		} else if (_commitment == LibOpen._getCommitment(0)) {
			yield.id=  id;
			yield.market=_market;
			yield.oldLengthAccruedYield = LibOpen._getApyTimeLength(_commitment);
			yield.oldTime = block.timestamp;
			yield.accruedYield = 0;
			deposit.isTimelockApplicable = false;
			deposit.isTimelockActivated = true;
			deposit.timelockValidity = 0;
			deposit.activationTime = 0;
		}

		savingsAccount.deposits.push(deposit);
		savingsAccount.yield.push(yield);

		activeDeposits.id.push(id-1);
		activeDeposits.market.push(_market);
		activeDeposits.commitment.push(_commitment);
		activeDeposits.amount.push(_amount);
		activeDeposits.savingsInterest.push(yield.accruedYield);

	}

	function accruedYield(address _account,bytes32 _market,bytes32 _commitment) private {
        
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		LibOpen._hasDeposit(_account, _market, _commitment);

		uint256 aggregateYield;

		SavingsAccount storage savingsAccount = ds.savingsPassbook[_account];
		DepositRecords storage deposit = ds.indDepositRecord[_account][_market][_commitment];
		YieldLedger storage yield = ds.indYieldRecord[_account][_market][_commitment];

		(yield.oldLengthAccruedYield, yield.oldTime, aggregateYield) = LibOpen._calcAPY(_commitment, yield.oldLengthAccruedYield, yield.oldTime, aggregateYield);

		aggregateYield = (aggregateYield*deposit.amount)/(365*86400*10000);

		yield.accruedYield += aggregateYield;
		savingsAccount.yield[deposit.id-1].accruedYield += aggregateYield;

	}

/// DELEGATED CALL - PROCESS DEPOSIT
	function _processDeposit(
		address _account,
		bytes32 _market,
		bytes32 _commitment,
		uint256 _amount
	) private {
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		SavingsAccount storage savingsAccount = ds.savingsPassbook[_account];
		DepositRecords storage deposit = ds.indDepositRecord[_account][_market][_commitment];
		YieldLedger storage yield = ds.indYieldRecord[_account][_market][_commitment];
		ActiveDeposits storage activeDeposits = ds.getActiveDeposits[_account];

		uint num = deposit.id - 1;

		accruedYield(_account, _market, _commitment);
		
		deposit.amount += _amount;
		deposit.lastUpdate =  block.timestamp;


		savingsAccount.deposits[num].amount += _amount;
		savingsAccount.deposits[num].lastUpdate =  block.timestamp;

		savingsAccount.yield[num].oldLengthAccruedYield = yield.oldLengthAccruedYield;
		savingsAccount.yield[num].oldTime = yield.oldTime;
		savingsAccount.yield[num].accruedYield = yield.accruedYield;

		activeDeposits.market[num] = _market;
		activeDeposits.commitment[num] = _commitment;
		activeDeposits.amount[num] += _amount;
		activeDeposits.savingsInterest[num] = yield.accruedYield;
	}

	function preDepositProcess(bytes32 _market,uint256 _amount) private {
    AppStorageOpen storage ds = LibOpen.diamondStorage(); 

		LibOpen._isMarketSupported(_market);
		ds.token = IBEP20(LibOpen._connectMarket(_market));
		// _quantifyAmount(_market, _amount);
		LibOpen._minAmountCheck(_market, _amount);
	}

    function getFairPriceDeposit(uint _requestId) external view override returns(uint){
		return LibOpen._getFairPrice(_requestId);
	}

	function _convertYield(address _account, bytes32 _market, bytes32 _commitment) private	{
		AppStorageOpen storage ds = LibOpen.diamondStorage(); 

		LibOpen._hasAccount(_account);

		SavingsAccount storage savingsAccount = ds.savingsPassbook[_account];
		DepositRecords storage deposit = ds.indDepositRecord[_account][_market][_commitment];
		YieldLedger storage yield = ds.indYieldRecord[_account][_market][_commitment];

		LibOpen._hasYield(yield);
		accruedYield(_account,_market,_commitment);


		deposit.amount += yield.accruedYield;
		deposit.lastUpdate = block.timestamp;
		
		/// RESETTING THE YIELD.
		yield.accruedYield = 0;

		savingsAccount.deposits[deposit.id -1].amount = deposit.amount;
		savingsAccount.deposits[deposit.id -1].lastUpdate = block.timestamp;
		savingsAccount.yield[deposit.id-1].accruedYield = 0;
	}

	function _updateUtilisation(bytes32 _market, uint _amount, uint _num) private 
	{
    AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		if (_num == 0)	{
			ds.marketUtilisationDeposit[_market] += _amount;
		} else if (_num == 1)	{
			ds.marketUtilisationDeposit[_market] -= _amount;
		}
	}

	function pauseDeposit() external override authDeposit() nonReentrant() {
		_pause();
	}
	
	function unpauseDeposit() external override authDeposit() nonReentrant() {
		_unpause();   
	}

	function isPausedDeposit() external view override virtual returns(bool) {
		return _paused();
	}

	modifier authDeposit() {
    AppStorageOpen storage ds = LibOpen.diamondStorage(); 
		require(IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.superAdmin, msg.sender) || IAccessRegistry(ds.superAdminAddress).hasAdminRole(ds.adminDeposit, msg.sender), "ERROR: Not an admin");
		_;
	}
}
