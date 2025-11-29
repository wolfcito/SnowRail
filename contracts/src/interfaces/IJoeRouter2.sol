// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IJoeRouter2
 * @dev Minimal interface for Trader Joe / Pangolin DEX router on Avalanche
 */
interface IJoeRouter2 {
    /**
     * @dev Swaps exact amount of input tokens for output tokens
     * @param amountIn Amount of input tokens to swap
     * @param amountOutMin Minimum amount of output tokens expected
     * @param path Array of token addresses for the swap path
     * @param to Address to receive the output tokens
     * @param deadline Unix timestamp deadline for the swap
     * @return amounts Array of amounts for each swap in the path
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @dev Returns the amounts of output tokens for a given input amount
     * @param amountIn Amount of input tokens
     * @param path Array of token addresses for the swap path
     * @return amounts Array of amounts for each token in the path
     */
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
}

