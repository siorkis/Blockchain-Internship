// const { assert } = require("console");
const truffleAssert = require('truffle-assertions');

const Factory = artifacts.require("Factory");
const Token = artifacts.require("Token");
const Pair = artifacts.require("Pair");

contract("Factory", function (accounts) 
{
  let factory = null;
  let token = null;
  
  let usdt;
  let bnb;

  // USDT/BNB - pair
  let pairUsdtBnb;
  let pairAddress;
  var lpRemoved;


  before(async() => 
  {
    factory = await Factory.deployed();
    token = await Token.deployed();

    //deployin tokens
    usdt = await Token.new('usdt','USDT');
    bnb = await Token.new('bnb','BNB');

    lpRemoved = false;
    
  });
  
  let pairWethUsdt;
  let wethAddress;


  describe("Factory:", async () => 
  {

    // happy
    describe("Happy", async () => 
    {
      it("getTokenPair: before", async () => 
      {
        const address1 = '0x1000000000000000000000000000000000000000';
        const address2 = '0x2000000000000000000000000000000000000000';
        pairAddress = await factory.getTokenPair(address1, address2);
        
        assert.equal(pairAddress, '0x0000000000000000000000000000000000000000');
      });
    
      it("createPair", async () => 
      {
        let result = await factory.createPair(usdt.address, bnb.address, {from: accounts[0]});
        let pairAddress = result.logs[0].args.pairAddress;
        
        // USDT/BNB - pair
        pairUsdtBnb = await Pair.at(pairAddress);
        
        truffleAssert.eventEmitted(result, 'PairCreated', event => 
        {
            return event.pairAddress == pairAddress;
        });
      });

      it("getTokenPair: after", async () => 
      {
          let reversed = await factory.getTokenPair(usdt.address, bnb.address);
          pairAddress = await factory.getTokenPair(bnb.address, usdt.address);
          
          assert.equal(pairAddress, reversed);
      });
    });


    // Non happy
    describe("Non happy path", async () => 
    {
      it("geting token pair: false for new addresses that dont have LP", async () => 
      {
          let waxp = '0x1000000000000123500000000000000000000000';
          let avax = '0x2000000000000275500000000000000000000000';

          let pair1 = await factory.getTokenPair(waxp, avax);
          let pair2 = await factory.getTokenPair(avax, waxp);
          
          assert.equal(pair1, false);
          assert.equal(pair2, false);
      });

      it("creating pair: creating pair with already existing address and swap their places", async () => 
      {
        await truffleAssert.reverts(factory.createPair(usdt.address, bnb.address), "pair already exists");
        await truffleAssert.reverts(factory.createPair(bnb.address, usdt.address), "pair already exists");
      });

      it("geting token pair: also true for swap pairs BNB/USDT = USDT/BNB", async () => 
      {
        let a = await factory.getTokenPair(usdt.address, bnb.address);
        let b = await factory.getTokenPair(bnb.address, usdt.address);

        assert.equal(a, b);
      });


    });

  });

  describe('Pair:', async () => 
  {
    describe('Happy', async () => 
    {
      it("addLiquidity", async () => 
      {
        // mint and approvance
        await usdt.mint(accounts[0], 1000, {from: accounts[0]});
        await bnb.mint(accounts[0], 100, {from: accounts[0]});

        await usdt.approve(pairUsdtBnb.address, 500, {from: accounts[0]});
        await bnb.approve(pairUsdtBnb.address, 50, {from: accounts[0]});

        let result = await pairUsdtBnb.addLiquidity(usdt.address, 500, 50,  {from: accounts[0]});
        let lpTokens = await pairUsdtBnb.balanceOf(accounts[0]);

        truffleAssert.eventEmitted(result, 'LiquidityAdded', (event) => 
        {
          return event.amount.toString() == lpTokens.toString() && event.from == accounts[0];
        });
      });
      
      describe('before removing lp', async () => 
      {
        it("swap", async () => 
        {
          await usdt.mint(accounts[1], 1000, {from: accounts[1]});
          await usdt.approve(pairUsdtBnb.address, 100, {from: accounts[1]});
          let minAmount = await pairUsdtBnb.getTokenAmount(100, usdt.address, {from: accounts[1]});
          
          //handle calculations
          let inputReserve;
          let outputReserve;

          if (usdt.address == pairUsdtBnb.secondToken()) 
          {
            inputReserve = await bnb.balanceOf(pairUsdtBnb.address);
            outputReserve = await usdt.balanceOf(pairUsdtBnb.address);
          } 
          else 
          {
            inputReserve = await usdt.balanceOf(pairUsdtBnb.address);
            outputReserve = await bnb.balanceOf(pairUsdtBnb.address);
          }

          inputReserve = inputReserve.toNumber();
          outputReserve = outputReserve.toNumber();

          const inputAmount = 100;
          const fee = 0.3;

          const inputAmountWithFee = inputAmount * (100 - fee);
          const numerator = inputAmountWithFee * outputReserve;
          const denominator = (inputReserve * 100) + inputAmountWithFee;
          
          const receivedTokens = parseInt(numerator / denominator);

          //swap
          await pairUsdtBnb.swap(100, minAmount, usdt.address, {from: accounts[1]});
          let balanceBnb = await bnb.balanceOf(accounts[1]);

          assert.equal(receivedTokens, balanceBnb.toNumber());

        });

        it("removing liquidity - USDT/BNB", async () => 
        {
          const balanceUsdtBefore = await usdt.balanceOf(accounts[0]);
          const balanceBnbBefore = await bnb.balanceOf(accounts[0]);
          const liqudityBefore = await pairUsdtBnb.balanceOf(accounts[0]);
  
          let usdtReserveBefore;
          let bnbReserveBefore;
          
          let usdtReserveAfter;
          let bnbReserveAfter;
  
          if (usdt.address > bnb.address) 
          {
            usdtReserveBefore = await pairUsdtBnb.firstReserve();
            bnbReserveBefore = await pairUsdtBnb.secondReserve();
          } 
          else
          {
            usdtReserveBefore = await pairUsdtBnb.secondReserve();
            bnbReserveBefore = await pairUsdtBnb.firstReserve();
          }
  
          let result = await pairUsdtBnb.removeLiquidity(liqudityBefore.toNumber() / 2, {from: accounts[0]});
          const balanceUsdtAfter = await usdt.balanceOf(accounts[0]);
          const balanceBnbAfter = await bnb.balanceOf(accounts[0]);
          
          await pairUsdtBnb.balanceOf(accounts[0]);
          
          if(usdt.address > bnb.address) 
          {
            usdtReserveAfter = await pairUsdtBnb.firstReserve();
            bnbReserveAfter = await pairUsdtBnb.secondReserve();
          } 
          else 
          {
            usdtReserveAfter = await pairUsdtBnb.secondReserve();
            bnbReserveAfter = await pairUsdtBnb.firstReserve();
          }
  
          
          const amount1 = liqudityBefore.toNumber() / 2 * usdtReserveBefore.toNumber() / liqudityBefore.toNumber();
          const amount2 = liqudityBefore.toNumber() / 2 * bnbReserveBefore.toNumber() / liqudityBefore.toNumber();
          
          let lpTokens = await pairUsdtBnb.balanceOf(accounts[0]);
          
          
          truffleAssert.eventEmitted(result, 'LiquidityRemoved', event => 
          {
            return event.amount.toString() == lpTokens.toString() && event.from == accounts[0];
          });
  
          lpRemoved = true;
  
  
          assert(usdtReserveBefore.toNumber() - amount1 == usdtReserveAfter.toNumber() 
          && bnbReserveBefore.toNumber() - amount2 == bnbReserveAfter.toNumber() 
          && balanceUsdtBefore.toNumber() + amount1 == balanceUsdtAfter.toNumber() 
          && balanceBnbBefore.toNumber() + amount2 == balanceBnbAfter.toNumber()); 
        });
      });


      describe('after removing lp', async () => 
      {
        it("swap", async () => 
        {
          if(lpRemoved == true)
            assert(true);
          else
            assert(false);
        });
      });
    });
    
    describe('Non happy path', async () => 
    {
      it("no swap with amount 0", async () => 
      {
        await truffleAssert.reverts(pairUsdtBnb.swap(0, 0, usdt.address), "value must be more than 0");
      });

      it("no swap with no existing address", async () => 
      {
        let a = "0x0000000000000000000000000000000000000123";
        await truffleAssert.reverts(pairUsdtBnb.swap(100, 100, a, {from: accounts[7]}), "wrong address of solden tokens");
      });

      it("no swap zerro address", async () => 
      {
        let a = "0x0000000000000000000000000000000000000000";
        await truffleAssert.reverts(pairUsdtBnb.swap(100, 100, a, {from: accounts[7]}), "wrong address of solden tokens");
      });

      it("no removing LP with zero liquidity", async () => 
      {
        await truffleAssert.reverts(pairUsdtBnb.removeLiquidity(0, {from: accounts[7]}), "invalid amount");
      });
    });


    describe('WETH: ', async () => 
    {
      describe('Happy path:', async () =>
      {
        it('createPairETH', async () => 
        {
          await usdt.mint(accounts[2], 1000000000000000);
    
          wethAddress = await factory.WETH();
          
          let result = await factory.createPair(usdt.address, wethAddress, {from: accounts[2]});
          let pairAddress = result.logs[0].args.pairAddress;
          
          pairWethUsdt = await Pair.at(pairAddress);
          
          truffleAssert.eventEmitted(result, 'PairCreated', (event) => 
          {
            return event.pairAddress == pairAddress;
          });
        });
    
        it('addETHLiquidity', async () => 
        {
          await usdt.approve(pairWethUsdt.address, 1000000, {from: accounts[2]});
          await pairWethUsdt.addETHLiquidity(1000000, {from: accounts[2], value: 10**15});
          let balance1 = await pairWethUsdt.firstReserve();
          let balance2 = await pairWethUsdt.secondReserve();
          assert(balance1.toNumber() == 10**15 && balance2 == 1000000);
        });
    
    
        it('swapEthToToken', async () => 
        {
          await usdt.mint(accounts[3], 100);
          balanceBefore = await web3.eth.getBalance(accounts[3]);
          
          await usdt.approve(pairWethUsdt.address, 100, {from: accounts[3]});
          
          let firstReserveBefore = await pairWethUsdt.firstReserve();
          let minEth = await pairWethUsdt.getTokenAmount(100, usdt.address);
          
          await pairWethUsdt.tokenToEthSwap(100, minEth, {from: accounts[3]});
          let firstReserveAfter = await pairWethUsdt.firstReserve();
          assert(minEth.toNumber() == firstReserveBefore.toNumber() - firstReserveAfter.toNumber());
        });
    
        it('swapTokenToEth', async () => 
        {
          let balanceBefore = await usdt.balanceOf(accounts[5]);
          let secondReserveBefore = await pairWethUsdt.secondReserve();
          let minTokens = await pairWethUsdt.getTokenAmount(100000000, wethAddress);
          
          await pairWethUsdt.ethToTokenSwap(minTokens, {from: accounts[5], value: 100000000});
          
          let secondReserveAfter = await pairWethUsdt.secondReserve();
          let balanceAfter = await usdt.balanceOf(accounts[5]);
          
          assert(minTokens.toNumber() == secondReserveBefore.toNumber() - secondReserveAfter.toNumber() && 
          secondReserveBefore.toNumber() - secondReserveAfter.toNumber() == balanceAfter.toNumber() - balanceBefore.toNumber());
        });
    
        it('Transfer LP to another account', async () => 
        {
          let liquidity = await pairWethUsdt.balanceOf(accounts[2]);
          await pairWethUsdt.transfer(accounts[3], liquidity, {from: accounts[2]});
          let liqudityAfter = await pairWethUsdt.balanceOf(accounts[3]);
          assert.equal(liquidity.toNumber(), liqudityAfter.toNumber());
        });
    
        it('Remove LP from another accout', async () => 
        {
          let liquidityBefore = await pairWethUsdt.balanceOf(accounts[3]);
          let usdtBefore = await usdt.balanceOf(accounts[3]);
          let usdtReserveBefore = await pairWethUsdt.secondReserve();
    
          let result = await pairWethUsdt.removeETHLiquidity(Math.trunc(liquidityBefore.toNumber() / 2), {from: accounts[3]});
          
          let liquidityAfter = await pairWethUsdt.balanceOf(accounts[3]);
          let usdtAfter = await usdt.balanceOf(accounts[3]);
          let usdtReserveAfter = await pairWethUsdt.secondReserve();
          
          
          let lpTokens = await pairWethUsdt.balanceOf(accounts[3]) - 1;
    
          truffleAssert.eventEmitted(result, 'LiquidityRemoved', (event) => 
          {
            return event.amount.toString() == lpTokens.toString() && event.from == accounts[3];
          });
    
    
          assert(Math.trunc(liquidityBefore / 2) == liquidityBefore.toNumber() - liquidityAfter.toNumber() &&
          usdtAfter.toNumber() - usdtBefore.toNumber() == usdtReserveBefore.toNumber() - usdtReserveAfter.toNumber());
        });
    
        it('Check fee from swap', async () => 
        {
          let firstReserveBefore = await pairWethUsdt.firstReserve();
          let secondReserveBefore = await pairWethUsdt.secondReserve();
    
          await usdt.mint(accounts[6], 100000000);
    
          let minAmount;

          for (let i = 0; i < 10; i++) 
          {
            minAmount = await pairWethUsdt.getTokenAmount(100000000, wethAddress);
            await pairWethUsdt.ethToTokenSwap(minAmount, {from: accounts[6], value: 10000000000000});
            
    
            await usdt.approve(pairWethUsdt.address, 9700, {from: accounts[6]});
            minAmount = await pairWethUsdt.getTokenAmount(9700, usdt.address);
            await pairWethUsdt.tokenToEthSwap(9700, minAmount, {from: accounts[6]});
          }
    
          let firstReserveAfter = await pairWethUsdt.firstReserve();
          let secondReserveAfter = await pairWethUsdt.secondReserve();
    
          assert(secondReserveAfter < secondReserveBefore && firstReserveAfter > firstReserveBefore, 
            `${secondReserveAfter} ${secondReserveBefore} ${firstReserveAfter} ${firstReserveBefore}`);
        });
      });

      describe('Non happy path', async () =>
      {
        it("removing LP ETH with zero liquidity?", async () => 
        {
          await truffleAssert.reverts(pairWethUsdt.removeETHLiquidity(0, {from: accounts[1]}), "Pair: invalid amount");
        });

        it("removing LP ETH with zero liquidity?", async () => 
        {
          await truffleAssert.reverts(pairWethUsdt.removeETHLiquidity(0, {from: accounts[1]}), "Pair: invalid amount");
        });        
      });
    });
      
  });
  
  
});
