// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../interfaces/IERC20.sol";

/**
 * @title FailingToken
 * @dev Mock ERC20 token that always fails on transfer (for testing error handling)
 */
contract FailingToken is IERC20 {
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _totalSupply;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor() {
        _name = "Failing Token";
        _symbol = "FAIL";
        _decimals = 18;
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address, uint256) external pure override returns (bool) {
        // Always fail transfer
        return false;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address, address, uint256) external pure override returns (bool) {
        // Always fail transferFrom
        return false;
    }

    // Helper function for testing - mint tokens (balance increases but transfers still fail)
    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
    }
}

