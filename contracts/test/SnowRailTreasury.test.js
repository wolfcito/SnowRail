const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SnowRailTreasury", function () {
  let treasury;
  let mockERC20;
  let mockRouter;
  let owner;
  let payee;
  let otherAccount;

  // Helper: Deploy mock ERC20 token
  async function deployMockERC20(name, symbol, decimals = 18) {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy(name, symbol, decimals);
    return token;
  }

  // Helper: Deploy mock router
  async function deployMockRouter() {
    const MockRouter = await ethers.getContractFactory("MockRouter");
    const router = await MockRouter.deploy();
    return router;
  }

  beforeEach(async function () {
    [owner, payee, otherAccount] = await ethers.getSigners();

    // Deploy mocks
    mockRouter = await deployMockRouter();
    mockERC20 = await deployMockERC20("Test Token", "TEST", 18);

    // Deploy treasury
    const SnowRailTreasury = await ethers.getContractFactory("SnowRailTreasury");
    treasury = await SnowRailTreasury.deploy(await mockRouter.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await treasury.owner()).to.equal(await owner.getAddress());
    });

    it("Should set the correct router", async function () {
      expect(await treasury.router()).to.equal(await mockRouter.getAddress());
    });
  });

  describe("requestPayment", function () {
    it("Should emit PaymentRequested event", async function () {
      const amount = ethers.parseEther("100");
      await expect(treasury.requestPayment(await payee.getAddress(), amount, await mockERC20.getAddress()))
        .to.emit(treasury, "PaymentRequested")
        .withArgs(await owner.getAddress(), await payee.getAddress(), amount, await mockERC20.getAddress());
    });
  });

  describe("executePayment", function () {
    const paymentAmount = ethers.parseEther("50");

    beforeEach(async function () {
      // Fund treasury with tokens
      await mockERC20.mint(await treasury.getAddress(), ethers.parseEther("100"));
    });

    it("Should transfer tokens successfully", async function () {
      const payeeBalanceBefore = await mockERC20.balanceOf(await payee.getAddress());
      
      await treasury.executePayment(
        await owner.getAddress(),
        await payee.getAddress(),
        paymentAmount,
        await mockERC20.getAddress()
      );

      const payeeBalanceAfter = await mockERC20.balanceOf(await payee.getAddress());
      expect(payeeBalanceAfter - payeeBalanceBefore).to.equal(paymentAmount);
    });

    it("Should emit PaymentExecuted event on success", async function () {
      await expect(
        treasury.executePayment(
          await owner.getAddress(),
          await payee.getAddress(),
          paymentAmount,
          await mockERC20.getAddress()
        )
      )
        .to.emit(treasury, "PaymentExecuted")
        .withArgs(await owner.getAddress(), await payee.getAddress(), paymentAmount, await mockERC20.getAddress());
    });

    it("Should emit PaymentFailed when insufficient funds", async function () {
      const largeAmount = ethers.parseEther("200");
      
      await expect(
        treasury.executePayment(
          await owner.getAddress(),
          await payee.getAddress(),
          largeAmount,
          await mockERC20.getAddress()
        )
      )
        .to.emit(treasury, "PaymentFailed")
        .withArgs(
          await owner.getAddress(),
          await payee.getAddress(),
          largeAmount,
          await mockERC20.getAddress(),
          "INSUFFICIENT_FUNDS"
        );
    });

    it("Should emit PaymentFailed when transfer fails", async function () {
      // Deploy a token that fails on transfer
      const FailingToken = await ethers.getContractFactory("FailingToken");
      const failingToken = await FailingToken.deploy();
      
      await failingToken.mint(await treasury.getAddress(), paymentAmount);
      
      await expect(
        treasury.executePayment(
          await owner.getAddress(),
          await payee.getAddress(),
          paymentAmount,
          await failingToken.getAddress()
        )
      )
        .to.emit(treasury, "PaymentFailed")
        .withArgs(
          await owner.getAddress(),
          await payee.getAddress(),
          paymentAmount,
          await failingToken.getAddress(),
          "TRANSFER_FAILED"
        );
    });
  });

  describe("authorizeSwap", function () {
    it("Should authorize swap only by owner", async function () {
      const maxAmount = ethers.parseEther("1000");
      
      await expect(
        treasury.authorizeSwap(await mockERC20.getAddress(), await mockERC20.getAddress(), maxAmount)
      )
        .to.emit(treasury, "SwapAuthorized")
        .withArgs(await owner.getAddress(), await mockERC20.getAddress(), await mockERC20.getAddress(), maxAmount);

      const allowance = await treasury.swapAllowances(
        await mockERC20.getAddress(),
        await mockERC20.getAddress()
      );
      expect(allowance).to.equal(maxAmount);
    });

    it("Should revert when non-owner tries to authorize", async function () {
      const maxAmount = ethers.parseEther("1000");
      
      await expect(
        treasury.connect(otherAccount).authorizeSwap(
          await mockERC20.getAddress(),
          await mockERC20.getAddress(),
          maxAmount
        )
      ).to.be.revertedWith("Not owner");
    });
  });

  describe("executeSwap", function () {
    const swapAmount = ethers.parseEther("100");
    const maxAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      // Authorize swap
      await treasury.authorizeSwap(await mockERC20.getAddress(), await mockERC20.getAddress(), maxAmount);
      
      // Fund treasury with tokens
      await mockERC20.mint(await treasury.getAddress(), swapAmount);
    });

    it("Should execute swap successfully", async function () {
      const path = [await mockERC20.getAddress(), await mockERC20.getAddress()];
      
      await expect(
        treasury.executeSwap(
          await mockERC20.getAddress(),
          await mockERC20.getAddress(),
          swapAmount,
          0,
          path
        )
      )
        .to.emit(treasury, "SwapExecuted")
        .withArgs(await owner.getAddress(), await mockERC20.getAddress(), await mockERC20.getAddress(), swapAmount);
    });

    it("Should reduce allowance after swap", async function () {
      const path = [await mockERC20.getAddress(), await mockERC20.getAddress()];
      
      await treasury.executeSwap(
        await mockERC20.getAddress(),
        await mockERC20.getAddress(),
        swapAmount,
        0,
        path
      );

      const remainingAllowance = await treasury.swapAllowances(
        await mockERC20.getAddress(),
        await mockERC20.getAddress()
      );
      expect(remainingAllowance).to.equal(maxAmount - swapAmount);
    });

    it("Should revert when swap not authorized", async function () {
      const path = [await mockERC20.getAddress(), await mockERC20.getAddress()];
      
      // Use different token pair that's not authorized
      const otherToken = await deployMockERC20("Other Token", "OTHER");
      
      await expect(
        treasury.executeSwap(
          await otherToken.getAddress(),
          await mockERC20.getAddress(),
          swapAmount,
          0,
          path
        )
      ).to.be.revertedWith("Swap not authorized or exceeds limit");
    });

    it("Should revert when swap exceeds allowance", async function () {
      const path = [await mockERC20.getAddress(), await mockERC20.getAddress()];
      const excessiveAmount = ethers.parseEther("2000");
      
      await expect(
        treasury.executeSwap(
          await mockERC20.getAddress(),
          await mockERC20.getAddress(),
          excessiveAmount,
          0,
          path
        )
      ).to.be.revertedWith("Swap not authorized or exceeds limit");
    });
  });

  describe("getTokenBalance", function () {
    it("Should return correct token balance", async function () {
      const balance = ethers.parseEther("75");
      await mockERC20.mint(await treasury.getAddress(), balance);
      
      expect(await treasury.getTokenBalance(await mockERC20.getAddress())).to.equal(balance);
    });
  });

  describe("transferOwnership", function () {
    it("Should transfer ownership to new owner", async function () {
      await treasury.transferOwnership(await otherAccount.getAddress());
      expect(await treasury.owner()).to.equal(await otherAccount.getAddress());
    });

    it("Should revert when transferring to zero address", async function () {
      await expect(
        treasury.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner");
    });

    it("Should revert when non-owner tries to transfer", async function () {
      await expect(
        treasury.connect(otherAccount).transferOwnership(await payee.getAddress())
      ).to.be.revertedWith("Not owner");
    });
  });

  describe("emergencyWithdraw", function () {
    const withdrawAmount = ethers.parseEther("50");

    beforeEach(async function () {
      await mockERC20.mint(await treasury.getAddress(), ethers.parseEther("100"));
    });

    it("Should withdraw tokens as owner", async function () {
      const recipientBalanceBefore = await mockERC20.balanceOf(await payee.getAddress());
      
      await treasury.emergencyWithdraw(await mockERC20.getAddress(), withdrawAmount, await payee.getAddress());
      
      const recipientBalanceAfter = await mockERC20.balanceOf(await payee.getAddress());
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(withdrawAmount);
    });

    it("Should revert when withdrawing to zero address", async function () {
      await expect(
        treasury.emergencyWithdraw(await mockERC20.getAddress(), withdrawAmount, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should revert when non-owner tries to withdraw", async function () {
      await expect(
        treasury.connect(otherAccount).emergencyWithdraw(
          await mockERC20.getAddress(),
          withdrawAmount,
          await payee.getAddress()
        )
      ).to.be.revertedWith("Not owner");
    });
  });
});

