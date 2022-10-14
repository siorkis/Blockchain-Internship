//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Exercise {
    address  public owner;
    string   public question;
    string[] public answers;
    uint256  public end_block;

    uint     public corect_answer;

    address[] users;
    mapping(address => uint) public users_answers;

    function usersAnswers(address user) public view returns(uint)
    {
        return users_answers[user];
    }

    event corectAnswer(uint num, string answer);

    modifier answerTimeout() {
        require(block.number < end_block, "Answer is sent too late");
        _;
    }

    modifier corectAnswerTime() {
        require(block.number > end_block, "Answer is sent too early");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Require to be owner");
        _;
    }

    constructor(string memory _question, string[] memory _answers) {
        owner     = msg.sender;
        question  = _question;
        answers   = _answers;

        // dont forget to set back
        // end_block = block.number + 540;
        end_block = block.number + 10;
    }

    function getanswers() public view returns (string[] memory) { return answers; }

    function answer(uint _responseId) answerTimeout public returns(uint)
    {
        require(users_answers[msg.sender] == 0, "User can answer only once");
        require(_responseId != 0 &&_responseId <= answers.length, "Unexisting answer");

        address user = msg.sender;

        users.push(user);
        users_answers[user] = _responseId;

        return users_answers[user];
    }

    function setCorectAnswer(uint _responseId) onlyOwner corectAnswerTime public returns (uint)
    {
        require(_responseId != 0 &&_responseId <= answers.length, "Unexisting answer");
        corect_answer = _responseId;

        emit corectAnswer(_responseId, answers[_responseId]);

        return corect_answer;
    }


    // function for tests
    uint poo;
    function _poo() public { poo += 1; }
    function isCorrectAnswer(address user) public view returns(bool) {
        require(corect_answer != 0, "Answer is not set yet");
        if (users_answers[user] == corect_answer){
            return true;
        } else{
            return false;
        }
    }
    function resetUserAnswer(address user) public {
        users_answers[user] = 0;
    }
}
