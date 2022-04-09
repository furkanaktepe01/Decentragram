import React, { Component } from 'react';
import Web3 from 'web3';
import Identicon from 'identicon.js';
import './App.css';
import Decentragram from '../abis/Decentragram.json';
import Navbar from './Navbar';
import Main from './Main';

const ipfsClient = require('ipfs-http-client');
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
class App extends Component {

  async componentWillMount() {
    await this.laodWeb3();
    await this.loadBlockchainData();
  }

  laodWeb3 = async () => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      window.ethereum.request({ method: "eth_requestAccounts" });
      window.web3 = new Web3(window.ethereum);
    } else {
      window.alert("Non-Ethereum Browser detected.");
    }
  }

  async loadBlockchainData() {

    const web3 = window.web3;

    const accounts = await web3.eth.getAccounts();
    this.setState({ account: accounts[0] });

    const networkId = await web3.eth.net.getId();
    const networkData = Decentragram.networks[networkId];
    if (networkData) {
      
      const decentragram = web3.eth.Contract(Decentragram.abi, networkData.address);
      const imageCount = await decentragram.methods.imageCount().call();
      this.setState({ decentragram, imageCount });

      for (var i = 1; i <= imageCount; i++) {
        const image = await decentragram.methods.images(i).call();
        this.setState({ images: [...this.state.images, image] });
      }

      this.setState({
        images: this.state.images.sort((a, b) => b.tipAmount - a.tipAmount)
      });

      this.setState({ loading: false });
    } else {
      window.alert("Decentragram contract is not deployed to the detected network.");
    }
  }

  captureFile = (event) => {
    
    event.preventDefault();

    const file = event.target.files[0];
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(file);

    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) });
    }
  }

  uploadImage = (description) => { console.log(3443)

    ipfs.add(this.state.buffer, (error, result) => {
      
      console.log("IPFS hash: " + result[0].hash);
      
      if (error) {
        console.log(error);
        return;
      }

      this.setState({ loading: true });
      this.state.decentragram.methods.uploadImage(result[0].hash, description)
        .send({ from: this.state.account })
        .on("transactionHash", (hash) => {
          this.setState({ loading: false });
        });
    });
  }

  tipImageOwner = (id, tipAmount) => {
    
    this.setState({ loading: true });
    
    this.state.decentragram.methods.tipImageOwner(id)
      .send({ from: this.state.account, value: tipAmount })
      .on("transactionHash", (hash) => {
        this.setState({ loading: false });
      });
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      decentragram: null,
      images: [],
      loading: true
    }
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              images={this.state.images}
              captureFile={this.captureFile}
              uploadImage={this.uploadImage}
              tipImageOwner={this.tipImageOwner}
            />
        }
      </div>
    );
  }
}

export default App;