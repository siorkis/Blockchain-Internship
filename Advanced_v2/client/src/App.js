import React, { Component } from "react";
import Internship from "./contracts/Internship.json";
import getWeb3 from "./getWeb3";

import "./App.css";
import "./bootstrap.min.css";

class App extends Component {
  state = { storageValue: 0, 
            web3: null, 
            accounts: null, 
            contract: null 
    };

  componentDidMount = async () => {
    try {
      //functions from contract
      
      // this.to = this.to.bind(this);
      // this.amount = this.amount.bind(this);
      // this.transfer = this.transfer.bind(this);
      
      // this.getanswers = this.getanswers.bind(this);
      // this.setCorectAnswer = this.setCorectAnswer.bind(this);
      // this.usersAnswers = this.usersAnswers.bind(this);
      // this.answer = this.answer.bind(this);
      // this.isCorrectAnswer = this.isCorrectAnswer.bind(this);
      // this.resetUserAnswer = this.resetUserAnswer.bind(this);
      


      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Internship.networks[networkId];
      const instance = new web3.eth.Contract(
        Internship.abi,
        deployedNetwork && deployedNetwork.address,
      );
      //const balanceOfMsgSender = await instance.methods.balanceOf(accounts[0]).call();
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, 
                      accounts, 
                      contract: instance
                      // balanceOfMsgSender
                    });

    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  // async describe functions from contract


  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
<body>

    <ul>
      <li><a href="https://gitlab.titanium.codes/blockchain/internships/2021-q2-3/roc_exercise">Block-Surveys</a></li>
      <li><a href="https://gitlab.titanium.codes/blockchain/internships/2021-q2-3/roc_exercise">All surveys</a></li>
      <li><a href="https://gitlab.titanium.codes/blockchain/internships/2021-q2-3/roc_exercise">Create Surveys</a></li>
    </ul>

    <div className="container ">
        <header className="header">
            
            

            <h1 id="title">
                Survey
            </h1>
            <p id="description">
                Question: Why are u running ?
            </p>
        </header>
        <form action="" id="survey-form">
            

            <div className="form-group">
                <label> 
                    <input type="radio" name="source" value="freinds"
                    className="inputRadio"
                    checked/> 5 
                </label>
                <label>
                    <input type="radio" name="source" value="tv-ads"
                    className="inputRadio"
                    />10 
                </label>
                <label>
                    <input type="radio" name="source" value="social-media"
                    className="inputRadio"
                    /> 20
                </label>
            </div>

            <div className="form-group">
                <button type="submit" id="submit" className="btn">Submit</button>
            </div>
        </form>
    </div>
</body>

      
    );
  }
}

export default App;

//https://gitlab.titanium.codes/blockchain/internships/2021-q2-3/roc_exercise