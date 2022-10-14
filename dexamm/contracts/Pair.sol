// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Token.sol";
import "./Math.sol";


contract Pair is ERC20 {

    event LiquidityAdded(uint256 amount, address from);
    event LiquidityRemoved(uint256 amount, address from);

    address public firstToken;
    address public secondToken;
    address private WETH;

    uint256 public firstReserve;
    uint256 public secondReserve;
    uint256 public liquidity;

    bool public state;


    constructor(address _firstToken, address _secondToken, string memory _name, string memory _symbol, address weth) ERC20(_name, _symbol) {
        require(_firstToken != address(0), "zero address");
        require(_secondToken != address(0), "zero address");

        WETH = weth;
        firstToken = _firstToken;
        secondToken = _secondToken;
    }

    function getReserve() public view returns (uint256, uint256) {
        return (firstReserve, secondReserve);
    }
    

    function calculateLiquidity(uint256 _firstTokenAmount, uint256 _secondTokenAmount) public {
        
        uint256 _totalSupply = totalSupply();
        (uint256 firstTokenReserve, uint256 secondTokenReserve) = getReserve();

        if (state){
            liquidity = Math.sqrt(_firstTokenAmount * _secondTokenAmount);
        } else {
            liquidity = Math.min(_firstTokenAmount * _totalSupply / firstTokenReserve, _secondTokenAmount * _totalSupply / secondTokenReserve);
        }
    
    } 


    function addLiquidity(address firstTokenAddress, uint256 _firstTokenAmount, uint256 _secondTokenAmount) public {

        if(secondToken == firstTokenAddress) {
            uint256 helper;
            helper = _firstTokenAmount;
            _firstTokenAmount = _secondTokenAmount;
            _secondTokenAmount = helper;
        }

        (uint256 firstTokenReserve, uint256 secondTokenReserve) = getReserve();
        

        if (firstTokenReserve == 0 && secondTokenReserve == 0) {
            
            IERC20(firstToken).transferFrom(msg.sender, address(this), _firstTokenAmount);
            IERC20(secondToken).transferFrom(msg.sender, address(this), _secondTokenAmount);
            
            state = true;
            
            calculateLiquidity(_firstTokenAmount, _secondTokenAmount);
        
        } else {

            uint256 firstTokenAmount = (_secondTokenAmount * firstTokenReserve) / secondTokenReserve;

            require(firstTokenAmount >= _firstTokenAmount, "wrong rate");
            
            IERC20(firstToken).transferFrom(msg.sender, address(this), _firstTokenAmount);
            IERC20(secondToken).transferFrom(msg.sender, address(this), _secondTokenAmount);
            
            state = false;

            calculateLiquidity(_firstTokenAmount, _secondTokenAmount);
        
        }

        require(liquidity > 0, "liquidity is low");

        _mint(msg.sender, liquidity);

        uint256 balance1 = IERC20(firstToken).balanceOf(address(this));
        uint256 balance2 = IERC20(secondToken).balanceOf(address(this));
        update(balance1, balance2);

        emit LiquidityAdded(liquidity, msg.sender);
    }



    function addETHLiquidity(uint256 _secondTokenAmount) public payable {

        require(firstToken == WETH, "pull must be eth");


        uint256 _firstTokenAmount = msg.value;
        (uint256 firstTokenReserve, uint256 secondTokenReserve) = getReserve();
        
        
        if (firstTokenReserve == 0 && secondTokenReserve == 0) {
            
            //default adding first liquidity

            firstReserve += _firstTokenAmount;
            IERC20(secondToken).transferFrom(msg.sender, address(this), _secondTokenAmount);
            
            state = true;

            calculateLiquidity(_firstTokenAmount, _secondTokenAmount);
        
        } else {

            // if liquidity wasnt emphty  
            state = false;
            uint256 firstTokenAmount = (_secondTokenAmount * firstTokenReserve) / secondTokenReserve;

            require(firstTokenAmount >= _firstTokenAmount, "wrong rate");
            
            firstReserve += _firstTokenAmount;
            
            IERC20(secondToken).transferFrom(msg.sender, address(this), _secondTokenAmount);

            calculateLiquidity(_firstTokenAmount, _secondTokenAmount);
        
        }

        require(liquidity > 0, "liquidity is low");
        
        _mint(msg.sender, liquidity);
        
        secondReserve = IERC20(secondToken).balanceOf(address(this));

        emit LiquidityAdded(liquidity, msg.sender);
    }


    function getAmount(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) private pure returns (uint256) {
        require(inputReserve > 0 && outputReserve > 0, "wrong reserves");

        uint256 inputAmountWithFee = inputAmount * 997;
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * 1000) + inputAmountWithFee;
        uint256 fee = numerator / denominator;
        
        return fee;
    }

    function getTokenAmount(uint256 tokenSold, address tokenSoldAddress) public view returns (uint256) {
        require(tokenSold > 0, "value must be more than 0");
        require(tokenSoldAddress == firstToken || tokenSoldAddress == secondToken, "wrong address of solden tokens");

        
        (uint256 firstTokenReserve, uint256 secondTokenReserve) = getReserve();
       
        if(tokenSoldAddress == firstToken){
            return getAmount(tokenSold, firstTokenReserve, secondTokenReserve);
        } else {
            return getAmount(tokenSold, secondTokenReserve, firstTokenReserve);
        }
    }

    function swap(uint256 soldAmount, uint256 _minAmount, address _tokenSoldAddress) public
    {
        require(soldAmount > 0, "value must be more than 0");
        require(_tokenSoldAddress == firstToken || _tokenSoldAddress == secondToken, "wrong address of solden tokens");
        (uint256 firstTokenReserve, uint256 secondTokenReserve) = getReserve();
        
        
        if(_tokenSoldAddress == firstToken) {
            uint256 tokenBought = getAmount(soldAmount, firstTokenReserve, secondTokenReserve);
            require(tokenBought >= _minAmount,"not enough tokens");
            IERC20(firstToken).transferFrom(msg.sender, address(this), soldAmount);
            IERC20(secondToken).transfer(msg.sender, tokenBought);
        } else {
            uint256 tokenBought = getAmount(soldAmount, secondTokenReserve, firstTokenReserve);
            require(tokenBought >= _minAmount,"not enough tokens");
            IERC20(secondToken).transferFrom(msg.sender, address(this), soldAmount);
            IERC20(firstToken).transfer(msg.sender, tokenBought);
        }

        uint256 balance1 = IERC20(firstToken).balanceOf(address(this));
        uint256 balance2 = IERC20(secondToken).balanceOf(address(this));

        update(balance1, balance2);
    }

    function ethToTokenSwap(uint256 _minTokens) public payable {
        require(firstToken == WETH, "This is not ether pair");

        (uint256 ethReserve, uint256 tokenReserve) = getReserve();
        uint256 tokensBought = getAmount( msg.value, ethReserve, tokenReserve);
        
        require(tokensBought >= _minTokens, "not enough balance");
        
        IERC20(secondToken).transfer(msg.sender, tokensBought);
        
        firstReserve += msg.value;
        secondReserve -= tokensBought;
    }

    function tokenToEthSwap(uint256 _tokensSold, uint256 _minEth) public {
        require(firstToken == WETH, "This is not ether pair") ;

        uint256 ethBought = getAmount(_tokensSold, secondReserve, firstReserve);

        require(ethBought >= _minEth, "not enough reserve");

        IERC20(secondToken).transferFrom(msg.sender, address(this), _tokensSold);
        payable(msg.sender).transfer(ethBought);

        firstReserve -= ethBought;
        secondReserve = IERC20(secondToken).balanceOf(address(this));
    }

    function removeLiquidity(uint256 _liquidity) public returns (uint256 amount1, uint256 amount2) {
        require(_liquidity > 0, "invalid amount");

        (uint256 firstTokenReserve, uint256 secondTokenReserve) = getReserve();
        uint256 _totalSupply = totalSupply();

        amount1 = _liquidity * firstTokenReserve / _totalSupply;
        amount2 = _liquidity * secondTokenReserve / _totalSupply;

        require(amount1 > 0 && amount2 > 0, "Invalid liqudity");
        _burn(msg.sender, _liquidity);
        
        
        if (firstToken == WETH) {
            payable(msg.sender).transfer(amount1);
            IERC20(secondToken).transfer(msg.sender, amount2);
            firstReserve -= amount1;
            secondReserve -= amount2;
        } else {
            IERC20(firstToken).transfer(msg.sender, amount1);
            IERC20(secondToken).transfer(msg.sender, amount2);

            uint256 balance1 = IERC20(firstToken).balanceOf(address(this));
            uint256 balance2 = IERC20(secondToken).balanceOf(address(this));
            update(balance1, balance2);
        }
        
        emit LiquidityRemoved(_liquidity, msg.sender);
    }

    function removeETHLiquidity(uint256 _liquidity) public returns (uint256 amount1, uint256 amount2) {
        (amount1, amount2) = _removeLiquidity(_liquidity);

        payable(msg.sender).transfer(amount1);
        IERC20(secondToken).transfer(msg.sender, amount2);
        
        firstReserve -= amount1;
        secondReserve -= amount2;

        emit LiquidityRemoved(_liquidity, msg.sender);
    }

    function _removeLiquidity(uint256 _liquidity) internal returns (uint256 amount1, uint256 amount2) {
        require(_liquidity > 0, "Pair: invalid amount");

        (uint256 token1Reserve, uint256 token2Reserve) = getReserve();
        uint256 _totalSupply = totalSupply();

        amount1 = _liquidity * token1Reserve / _totalSupply;
        amount2 = _liquidity * token2Reserve / _totalSupply;

        require(amount1 > 0 && amount2 > 0, "Pair: Invalid liqudity");
        _burn(msg.sender, _liquidity);
    }



    function update(uint256 balance1, uint256 balance2) private {
        require(balance1 <= uint256(2**256 - 1) && balance2 <= uint256(2**256 - 1), 'overflow');

        firstReserve = balance1;
        secondReserve = balance2;
    }
    
}