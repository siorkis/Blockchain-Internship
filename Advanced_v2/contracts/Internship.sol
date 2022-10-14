
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Exercise.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Internship {
    address public internToken = 0xF156876D92cd76FE04587878f7313b53A92787eb;


    address[] activeExercises;

    uint256 reward = 5;

    modifier onlyWhitelist() {
        bytes memory callInfo = abi.encodeWithSignature("checkWHitelist(address)", msg.sender);
        (bool success, bytes memory returnData) = address(internToken).call(callInfo);
        require(success, "error caused with calling contract InternToken");
        bool isWhitelisted = abi.decode(returnData, (bool));
        require(isWhitelisted, "sender is not whitelisted");
        _;
    }

    function addExercice(string memory _question, string[] memory _answers) onlyWhitelist public {
        Exercise ex = new Exercise(_question, _answers);

        activeExercises.push(address(ex));

    }

    function getReward(address _exercise) public {
        require(Exercise(_exercise).isCorrectAnswer(msg.sender), "User's answer is not correct");

        Exercise(_exercise).resetUserAnswer(msg.sender);

        IERC20(internToken).transfer(msg.sender, reward);

    }

    function deleteExercise(uint index) onlyWhitelist public {

        for(uint i = index; i < activeExercises.length - 1; ++i) {
            activeExercises[i] = activeExercises[i+1];
        }
        activeExercises.pop();
    }

    function getActiveExercises() public view returns(address[] memory) {
        return activeExercises;
    }

}

