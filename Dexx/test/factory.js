// const { assert } = require("console");
const truffleAssert = require('truffle-assertions');

const Factory = artifacts.require("Factory");
const Token = artifacts.require("Token");
const Pair = artifacts.require("Pair");

contract("Factory", accounts =>
{
  let factory = null;
  let token = null;
  
  before(async() => 
  {
    factory = await Factory.deployed();
    token = await Token.deployed();
  });

  let usdt;
  let bnb;
  let pairUsdtBnb;

  describe("Factory:", async () => 
  {
    // it("should check non existing pair == zero address", async () => 
    // {
    //   const address1 = '0x1000000000000000000000000000000000000000';
    //   const address2 = '0x2000000000000000000000000000000000000000';
    //   let pairAddress = await factory.getExistingPair(address1, address2);
    //   assert.equal(pairAddress, '0x0000000000000000000000000000000000000000');
    // });
  
    it("pool created", async () => 
    {
      usdt = await Token.new('usdt','USDT');
      bnb = await Token.new('bnb','BNB');  
      let result = await factory.createPair(usdt.address, bnb.address, {from: accounts[0]});
      let pairAddress = result.logs[0].args.pairAddress;
      pairUsdtBnb = await Pair.at(pairAddress);
      truffleAssert.eventEmitted(result, 'PairCreated', (event) => {
          return event.pairAddress == pairAddress;
      });
    });

    it("pool's adress exist", async () => 
    {
        let reversed = await factory.getExistingPair(usdt.address, bnb.address);
        let pairAddress = await factory.getExistingPair(bnb.address, usdt.address);

        assert.equal(pairAddress, reversed);
    });
  });


  describe('Pair:', async () => 
  {
    it("liquidity successfully added", async () => 
    {
      await usdt.mint(1000, {from: accounts[0]});
      await bnb.mint(100, {from: accounts[0]});
      await usdt.approve(pairUsdtBnb.address, 500, {from: accounts[0]});
      await bnb.approve(pairUsdtBnb.address, 50, {from: accounts[0]});
      
      let result = await pairUsdtBnb.addLiquidity(500, 50, usdt.address, bnb.address, {from: accounts[0]});
      let lpTokens = await pairUsdtBnb.balanceOf(accounts[0]);
      
      truffleAssert.eventEmitted(result, 'LiquidityAdded', (event) => {
        return event.amount.toString() == lpTokens.toString() && event.from == accounts[0];
      });
    });

    it("success swap", async () => 
    {
      await usdt.mint(1000, {from: accounts[1]});
      await usdt.approve(pairUsdtBnb.address, 100, {from: accounts[1]});
      let minAmount = await pairUsdtBnb.getTokenAmount(100, usdt.address, {from: accounts[1]});
      //handle calculations
      let inputReserve;
      let outputReserve;
      
      if (usdt.address == pairUsdtBnb.token2()) 
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
      const fee = 1;
      const inputAmountWithFee = inputAmount * (100 - fee);
      const numerator = inputAmountWithFee * outputReserve;
      const denominator = (inputReserve * 100) + inputAmountWithFee;
      const receivedTokens = parseInt(numerator / denominator);

      //swap
      await pairUsdtBnb.swap(100, minAmount, usdt.address, {from: accounts[1]});
      let balanceBnb = await bnb.balanceOf(accounts[1]);

      assert.equal(receivedTokens, balanceBnb.toNumber());
    });


    // it("checks the name of LP tokens", async () => 
    // {
    //   let name = await pairUsdtBnb.name();
    //   assert.equal(name, "LP-Token");
    // });

    // it("checks the symbol of LP tokens", async () => 
    // {
    //   let symbol = await pairUsdtBnb.symbol();
    //   return symbol == 'USDT-BNB-LP' || symbol == 'BNB-USDT-LP';
    // });
    });
  });
