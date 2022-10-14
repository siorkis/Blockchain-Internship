// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./Pair.sol";
import "./Token.sol";


contract Factory {
  
  address public WETH;
  mapping(address => mapping(address => address)) private getPair;
  event PairCreated(address pairAddress);                                                                                                       


  constructor() {
    ERC20 weth = new ERC20("Wrapped ETH", "WETH");
    WETH = address(weth);
  }

  function createPair(address tokenA, address tokenB) public returns (address) {
    require(tokenB != tokenA && tokenB != address(0) && tokenA != address(0), "Factory: wrong addresses");

    (address first, address second) = tokenA > tokenB || tokenA == WETH ? (tokenA, tokenB) : (tokenB, tokenA);
    require(getPair[first][second] == address(0), "Factory: pair already exists");
    
    string memory symbol1 = ERC20(first).symbol();
    string memory symbol2 = ERC20(second).symbol();
    string memory symbol = string(abi.encodePacked(symbol1, "-", symbol2, "-LP"));

    
    Pair newPair = new Pair(first, second, "LP-Token", symbol, WETH);
    getPair[first][second] = address(newPair);
    emit PairCreated(address(newPair));
    return address(newPair);
  }

  function getExistingPair(address tokenA, address tokenB) public view returns(address) {
    (address first, address second) = tokenA > tokenB || tokenA == WETH ? (tokenA, tokenB) : (tokenB, tokenA);
    return getPair[first][second];
  }

}
