// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/IJoeRouter2.sol";

/**
 * @title SnowRailTreasury
 * @dev Treasury contract for SnowRail payroll system on Avalanche C-Chain
 * Handles payment requests, executions, and token swaps via DEX
 */
contract SnowRailTreasury {
    address public owner;
    IJoeRouter2 public router;

    // Mapping: fromToken => toToken => maxAmount allowed for swap
    mapping(address => mapping(address => uint256)) public swapAllowances;

    // Events for payment lifecycle
    event PaymentRequested(address indexed payer, address indexed payee, uint256 amount, address token);
    event PaymentExecuted(address indexed payer, address indexed payee, uint256 amount, address token);
    event PaymentFailed(address indexed payer, address indexed payee, uint256 amount, address token, string reason);
    
    // Events for swap operations
    event SwapAuthorized(address indexed owner, address indexed fromToken, address indexed toToken, uint256 maxAmount);
    event SwapExecuted(address indexed swapper, address indexed fromToken, address indexed toToken, uint256 amount);

    /**
     * @dev Constructor sets the owner and DEX router
     * @param _router Address of the DEX router (Trader Joe / Pangolin)
     */
    constructor(address _router) {
        owner = msg.sender;
        router = IJoeRouter2(_router);
    }

    /**
     * @dev Modifier to restrict functions to owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @dev Request a payment from payer to payee
     * @param payee Address to receive the payment
     * @param amount Amount of tokens to pay
     * @param token Address of the ERC-20 token
     * TODO: In production, store payment requests in a struct for tracking
     * TODO: Add nonce or unique ID for payment deduplication
     */
    function requestPayment(address payee, uint256 amount, address token) external {
        // TODO: Validate payee is not zero address
        // TODO: Store payment request details for later execution
        emit PaymentRequested(msg.sender, payee, amount, token);
    }

    /**
     * @dev Authorize a token swap with maximum amount
     * @param fromToken Source token address
     * @param toToken Destination token address
     * @param maxAmount Maximum amount allowed for swap
     */
    function authorizeSwap(address fromToken, address toToken, uint256 maxAmount) external onlyOwner {
        swapAllowances[fromToken][toToken] = maxAmount;
        emit SwapAuthorized(msg.sender, fromToken, toToken, maxAmount);
    }

    /**
     * @dev Execute a payment from treasury to payee
     * @param payer Original payer address (for event tracking)
     * @param payee Address to receive the payment
     * @param amount Amount of tokens to transfer
     * @param token Address of the ERC-20 token
     * TODO: In production, verify payment was previously requested
     * TODO: Add reentrancy guard
     * TODO: Read events to confirm success instead of assuming
     */
    function executePayment(address payer, address payee, uint256 amount, address token) external {
        IERC20 erc20 = IERC20(token);
        uint256 balance = erc20.balanceOf(address(this));

        // Check if treasury has sufficient balance
        if (balance < amount) {
            emit PaymentFailed(payer, payee, amount, token, "INSUFFICIENT_FUNDS");
            return;
        }

        // Attempt transfer
        bool success = erc20.transfer(payee, amount);
        if (!success) {
            emit PaymentFailed(payer, payee, amount, token, "TRANSFER_FAILED");
            return;
        }

        emit PaymentExecuted(payer, payee, amount, token);
    }

    /**
     * @dev Execute a token swap via DEX router
     * @param fromToken Source token address
     * @param toToken Destination token address
     * @param amountIn Amount of source tokens to swap
     * @param amountOutMin Minimum amount of destination tokens expected
     * @param path Swap path through the DEX
     * TODO: Add slippage protection configuration
     * TODO: Implement deadline as parameter instead of hardcoded
     */
    function executeSwap(
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path
    ) external {
        // Verify swap is authorized
        require(swapAllowances[fromToken][toToken] >= amountIn, "Swap not authorized or exceeds limit");

        // Reduce allowance
        swapAllowances[fromToken][toToken] -= amountIn;

        // Approve router to spend tokens
        IERC20(fromToken).approve(address(router), amountIn);

        // Execute swap with 15 minute deadline
        // TODO: Make deadline configurable
        router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp + 15 minutes
        );

        emit SwapExecuted(msg.sender, fromToken, toToken, amountIn);
    }

    /**
     * @dev Get the current balance of a token in treasury
     * @param token Address of the ERC-20 token
     * @return balance Current balance of the token
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Transfer ownership of the treasury
     * @param newOwner Address of the new owner
     * TODO: Implement two-step ownership transfer for security
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }

    /**
     * @dev Emergency withdraw tokens from treasury
     * @param token Address of the ERC-20 token
     * @param amount Amount to withdraw
     * @param to Address to send tokens to
     * TODO: Add timelock for emergency withdrawals
     */
    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        IERC20(token).transfer(to, amount);
    }
}

