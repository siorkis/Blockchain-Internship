const Internship = artifacts.require("Internship");
const Exercise = artifacts.require("Exercise");

module.exports = function (deployer)
{
  let question = "How many fingers human have?(on one hand)";
  let answers = ["1", "2", "3", "4", "5"];
  deployer.deploy(
    Exercise,
    question,
    answers
  );
  deployer.deploy(Internship);
};
