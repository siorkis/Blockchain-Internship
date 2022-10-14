const Exercise = artifacts.require("Exercise");
const truffleAssert = require("truffle-assertions");


contract("Exercise", accounts =>
{
  let instance;

  describe.only("Deployment tests", () => {
    let question;
    let answers = [];

    before( async () => {
      question = "How many fingers human have?(on one hand)";
      block = await web3.eth.getBlockNumber();
      instance = await Exercise.deployed({from: accounts[0]});
    });

    it("Check end-block", async () => {
      expected = parseInt(block) + 10 - 2;

      assert.equal(await instance.end_block(), expected);
    });

    it("Check owner", async () => {
      _owner = await instance.owner();
      expected = accounts[0];

      assert.equal(_owner, expected);
    });

    it("Check question", async () => {
      getQuestion = await instance.question();

      assert.equal(getQuestion, question);
    });

    it("Check answers", async () => {
      expected = ["1", "2", "3", "4", "5"];
      answers = await instance.getanswers();

      assert.equal(answers.toString(), expected.toString());
    });
  });

  describe("function answer", () => {
    let correctAnswer;
    before( async () => {
      instance = await Exercise.deployed();
      correctAnswer = 4;
    });

    it("answer: Answer must be 5", async () =>
    {
      const answer = await instance.answer.call(4, {from: accounts[1]});
      assert.equal(answer, correctAnswer, `Answer is ${answer}`);
    });

    it("setCorectAnswer: Setting right answer", async () =>
    {
      for(var i = 0; i < 10; i++)
        await instance._poo({from: accounts[0]});

      await instance.setCorectAnswer(correctAnswer, {from: accounts[0]});
      const rightAnswer = await instance.setCorectAnswer(correctAnswer, {from: accounts[0]});

      truffleAssert.eventEmitted(rightAnswer, 'corectAnswer', (ev) => {
        console.log(`event ${ev.answer}\n\n correct answer ${correctAnswer}`);
        return ev.num == correctAnswer && ev.answer == "5";
      });
    });


    it("get correct answer", async () => {
      let getAnswer = await instance.corect_answer();
      expected = correctAnswer;

      assert.equal(getAnswer, expected, "Answer is not the same");
    });
  });

  // onlyowner
  // answer timeout
  // correctanswertime
  describe.only("Not happy paths", () => {
    before( async () => {
      instance = await Exercise.deployed();
      correctAnswer = 3;
    });

    it("User must answer only once", async () =>
    {
      await instance.answer(correctAnswer, {from: accounts[2]});
      await truffleAssert.reverts(
        instance.answer(correctAnswer, {from: accounts[2]}),
        "User can answer only once"
      );
    });

    it("Only owner revert", async () => {
      await truffleAssert.reverts(
        instance.setCorectAnswer(correctAnswer, {from: accounts[2]}),
        "Require to be owner"
      );
    });

    it("Correct answer sent too early", async () => {
      await truffleAssert.reverts(
        instance.setCorectAnswer(correctAnswer, {from: accounts[0]}),
        "Answer is sent too early"
      );
    });

    it("Answer sent after time-limit", async() => {
      for(var i = 0; i < 10; i++)
        await instance._poo({from: accounts[0]});
      await truffleAssert.reverts(
        instance.answer(correctAnswer, {from: accounts[3]}),
        "Answer is sent too late"
      );
    });
  });
});
