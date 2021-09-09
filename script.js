import { ethers } from "./ethers-5.2.esm.min.js";

var provider, signer, smartContract, cost, connected


// smart contract
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

// declared functions which you want to use of the contract (not necessairly all)
const contractAbi = [
	"function mint(address _to, uint256 _mintAmount) public payable",
	"function tokenURI(uint256 tokenId)	public view	returns (string)",
	"function walletOfOwner(address _owner)	public view returns (uint256)",
	"function cost() public view returns (uint256)"
]

let connectInterval = setInterval(() => {
	if (connected) {
		$(".hidden").removeClass('hidden')
		$("#connectMetamask").addClass('hidden')
		clearInterval(connectInterval)
	}
}, 3000)



// listeners
$(window).on("load", async () => {
	if (!window.ethereum) {
		$('#status').html('Please install Metamask!!')
	} else {
		provider = new ethers.providers.Web3Provider(window.ethereum)
		signer = provider.getSigner()
		try {
			await signer.getAddress()	
			connected = true
			$("body").addClass('connected')
			init()
		} catch (error) {
			connected = false
			console.log(error)
		}
	}
	if (connected) {
		$(".hidden").removeClass('hidden')
		$("#connectMetamask").addClass('hidden')
		clearInterval(connectInterval)
	}
})

$("#connectMetamask").on("click", async () => {
	if (window.ethereum) {
		// connect to metamask
		// provider is connection to ethereum, signer is connected account
		provider = new ethers.providers.Web3Provider(window.ethereum)
		try {
			// Prompt user for account connections
			await provider.send("eth_requestAccounts", [])
			signer = provider.getSigner()
			connected = true
			$("body").addClass('connected')
			init()
		} catch (error) {
			$('#status').html('User has denied account access!!')
			connected = false
			console.log(error)
		}
	} else {
		$('#status').html('Please install Metamask!!')
		connected = false
	}
})

$("#claimNFT").on("click", async () => {
	let amount = $("#nftAmount").val()
	let address = await signer.getAddress()
	let overrides = {
		// To convert Ether to Wei:
		value: ethers.utils.parseEther(String(amount * cost))     // ether in this case MUST be a string
	}
	try {
		await smartContract.connect(signer).mint(address, amount, overrides)
	} catch (error) {
		$("#status").html("Somethin went wrong, try again.")
		console.log(error);
	}
})


// gets run when metamask is connected
const init = () => {
	smartContract = new ethers.Contract(contractAddress, contractAbi, provider)
	getCost()
}

async function getCost () {
	cost = ethers.utils.formatEther(await smartContract.cost())
}