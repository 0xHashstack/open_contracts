// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;
contract Test {
    bytes32 private student;
    address private _owner;
    constructor() {
        _owner = msg.sender;
    }
    function getStudent() public view returns(bytes32) {
        return student;
    }

    function addStudent(bytes32 st) external {
        student = st;
    }

    function destroy() external onlyMe {
        student = 0x0;
    }

    modifier onlyMe {
        require(msg.sender == _owner, "You cannot access");
        _;
    }
}