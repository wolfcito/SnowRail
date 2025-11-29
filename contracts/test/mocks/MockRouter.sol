// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/interfaces/IJoeRouter2.sol";

/**
 * @title MockRouter
 * @dev Mock DEX router for testing purposes
 */
contract MockRouter is IJoeRouter2 {
    // Mock implementation that always succeeds
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "Router: deadline expired");
        require(path.length >= 2, "Router: invalid path");
        
        // Return mock amounts array
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        // Simple mock: assume 1:1 swap for testing
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amountOutMin;
        }
        
        return amounts;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) 
        external 
        pure 
        override 
        returns (uint256[] memory amounts) 
    {
        require(path.length >= 2, "Router: invalid path");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        // Simple mock: assume 1:1 swap for testing
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amountIn;
        }
        
        return amounts;
    }
}

