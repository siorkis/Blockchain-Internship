// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;


import "./Token.sol";
import "./libraries/Math.sol";

contract Pair is ERC20 {
    address public token1;
    address public token2;
    address private WETH;

    uint256 public reserve1;
    uint256 public reserve2;

    event LiquidityAdded(uint256 amount, address from);
    event LiquidityRemoved(uint256 amount, address from);


    constructor(address _token1, address _token2, string memory _name,  string memory _symbol, address weth) ERC20(_name, _symbol) {
        require(_token1 != address(0) && _token2 != address(0), "Pair: Wrong address");
        WETH = weth;
        token1 = _token1;
        token2 = _token2;
    }

    function getReserve() public view returns (uint256, uint256) {
        return (IERC20(token1).balanceOf(address(this)), IERC20(token2).balanceOf(address(this)));
    }

    function addLiquidity(uint256 _token1Amount, uint256 _token2Amount, address tokenA, address tokenB) public {
        
        if(token1 == tokenB) 
        {
            uint256 helper;
            helper = _token1Amount;
            _token1Amount = _token2Amount;
            _token2Amount = helper;
        }

        (uint256 token1Reserve, uint256 token2Reserve) = getReserve();
        uint256 _totalSupply = totalSupply();
        uint256 liquidity;
        
        if (token1Reserve == 0 && token2Reserve == 0) {
            
            IERC20(token1).transferFrom(msg.sender, address(this), _token1Amount);
            IERC20(token2).transferFrom(msg.sender, address(this), _token2Amount);
            liquidity = Math.sqrt(_token1Amount * _token2Amount);
        
        } else {
            
            uint256 token1Amount = (_token2Amount * token1Reserve) / token2Reserve;
            require(token1Amount >= _token1Amount, "Pair: invalid rate");
            IERC20(token1).transferFrom(msg.sender, address(this), _token1Amount);
            IERC20(token2).transferFrom(msg.sender, address(this), _token2Amount);
            liquidity = Math.min(_token1Amount * _totalSupply / token1Reserve, _token2Amount * _totalSupply / token2Reserve);
        }

        require(liquidity > 0, "Pair: invalid liquidity");
        
        _mint(msg.sender, liquidity);

        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 balance2 = IERC20(token2).balanceOf(address(this));
        
        update(balance1, balance2);

        emit LiquidityAdded(liquidity, msg.sender);
    }

    function addLiquidityETH(uint256 _token1Amount, uint256 _tokenETHAmount, address tokenA, address tokenETH) 
        public payable {
        
        require(tokenETH == WETH);
        addLiquidity(_token1Amount, _tokenETHAmount, tokenA, tokenETH);
    }

    function getAmount(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) private pure returns (uint256) {
        
        require(inputReserve > 0 && outputReserve > 0, "Pair: invalid reserves");
        uint256 inputAmountWithFee = inputAmount * 99;
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * 100) + inputAmountWithFee;
        return numerator / denominator;
    }

    function getTokenAmount(uint256 tokenSold, address tokenSoldAddress) public view returns (uint256) {
        
        require(tokenSold > 0, "Pair: wrong value, must be > 0");
        require(tokenSoldAddress == token1 || tokenSoldAddress == token2, "Pair: invalid tokenSoldAddress");
        
        (uint256 token1Reserve, uint256 token2Reserve) = getReserve();
        
        if(tokenSoldAddress == token1) {
            return getAmount(tokenSold, token1Reserve, token2Reserve);
        } else {
            return getAmount(tokenSold, token2Reserve, token1Reserve);
        }
    }

    function swap(uint256 _tokenSold, uint256 _minAmount, address _tokenSoldAddress) public {
        require(_tokenSold > 0, "Pair: wrong value, must be > 0");
        require(_tokenSoldAddress == token1 || _tokenSoldAddress == token2, "Pair: invalid tokenSoldAddress");
        (uint256 token1Reserve, uint256 token2Reserve) = getReserve();
        
        if(_tokenSoldAddress == token1) {
            uint256 tokenBought = getAmount(_tokenSold, token1Reserve, token2Reserve);
            require(tokenBought >= _minAmount,"Pair: not enough tokens");
            IERC20(token1).transferFrom(msg.sender, address(this), _tokenSold);
            IERC20(token2).transfer(msg.sender, tokenBought);
        } else {
            uint256 tokenBought = getAmount(_tokenSold, token2Reserve, token1Reserve);
            require(tokenBought >= _minAmount,"Pair: not enough tokens");
            IERC20(token2).transferFrom(msg.sender, address(this), _tokenSold);
            IERC20(token1).transfer(msg.sender, tokenBought);
        }

        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 balance2 = IERC20(token2).balanceOf(address(this));
        update(balance1, balance2);
    }

    function removeLiquidity(uint256 _liquidity) public returns (uint256 amount1, uint256 amount2) {
        require(_liquidity > 0, "Pair: invalid amount");
        (uint256 token1Reserve, uint256 token2Reserve) = getReserve();
        uint256 _totalSupply = totalSupply();
        amount1 = _liquidity * token1Reserve / _totalSupply;
        amount2 = _liquidity * token2Reserve / _totalSupply;

        require(amount1 > 0 && amount2 > 0, "Pair: Invalid liqudity");
        _burn(msg.sender, _liquidity);
        IERC20(token1).transfer(msg.sender, amount1);
        IERC20(token2).transfer(msg.sender, amount2);

        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 balance2 = IERC20(token2).balanceOf(address(this));
        update(balance1, balance2);
        emit LiquidityRemoved(_liquidity, msg.sender);
    }

    function update(uint256 balance1, uint256 balance2) private {
        require(balance1 <= uint256(2**256 - 1) && balance2 <= uint256(2**256 - 1), 'Pair: OVERFLOW');

        reserve1 = balance1;
        reserve2 = balance2;
    }
    
}