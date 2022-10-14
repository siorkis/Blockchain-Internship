const factory = artifacts.require("Factory");
const token = artifacts.require("Token");
const pair = artifacts.require("pair");

module.exports = function (deployer) {
  deployer.deploy(factory);

  deployer.deploy(token, "first token", "for-migration");

  const address1 = '0x1000000000000000000000000000000000000000';
  const address2 = '0x2000000000000000000000000000000000000000';
  const address3 = '0x0000000000000000000000000000000000000000';
  deployer.deploy(pair, address1, address2, 'deploy', 'pair', address3);
}