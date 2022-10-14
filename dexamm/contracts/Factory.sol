// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Pair.sol";
import "./Token.sol";


contract Factory {
  
    address public WETH;

    event PairCreated(address pairAddress);

    mapping(address => mapping(address => address)) private getPair;


    constructor(){
      ERC20 weth = new ERC20("Wrapped ETH", "WETH");
      WETH = address(weth);
    }


    function _niceLogicSwap(address A, address B) internal view returns (address first, address second) {
      (first, second) = A == WETH ? (A, B) : B == WETH ? (B, A) : A > B ? (A, B) : (B, A);
    }

    function createPair(address A, address B) public returns (address) {
      
      require(B != A, "address must be unique");
      
      (address first, address second) = _niceLogicSwap(A, B);

      string memory symbol = _pairName(first, second);

      require(B != address(0) || A != address(0), "zero address");
      require(getPair[first][second] == address(0), "pair already exists");

      address newPair = _createPair(first, second, symbol);
      
      emit PairCreated(address(newPair));
      return address(newPair);
    }

    
    function getTokenPair(address A, address B) public view returns(address) {
      (address first, address second) = _niceLogicSwap(A, B);
      return getPair[first][second];
    }


      //  function geting addresses of two tokens and returns lp-name of them Ex: USDT-DAI-LP
    
    function _pairName(address A, address B) internal view returns(string memory) {
        ERC20 _A = ERC20(A);
        ERC20 _B = ERC20(B);

        return string(abi.encodePacked(_A.symbol(), "-", _B.symbol(), "-LP"));
    }
  
      //  This function gets addresses and symbol of two tokens, and returns their address
    
    function _createPair(address A, address B, string memory symbol) internal returns(address) {
      Pair newPair = new Pair(A, B, "LP-Token", symbol, WETH);
      return getPair[A][B] = address(newPair);
    }

}
