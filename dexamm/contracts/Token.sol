// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}
  
  function mint(address account, uint256 amount) public virtual {
      _mint(account, amount);
  }
}