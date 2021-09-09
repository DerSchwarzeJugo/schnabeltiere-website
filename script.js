import { ethers } from "./js/ethers-5.2.esm.min.js";

var provider, signer, address, smartContract, cost, connected, uriList
// smart contract
const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

// declared functions which you want to use of the contract (not necessairly all)
const contractAbi = [
	"function mint(address _to, uint256 _mintAmount) public payable",
	"function tokenURI(uint256 tokenId)	public view	returns (string)",
	"function walletOfOwner(address _owner)	public view returns (uint256[])",
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
	let overrides = {
		// To convert Ether to Wei:
		value: ethers.utils.parseEther(String(amount * cost))     // ether in this case MUST be a string
	}
	try {
		await smartContract.connect(signer).mint(address, amount, overrides).then(() => getOwnWallet(amount))
	} catch (error) {
		$("#status").html("Somethin went wrong, try again.")
		console.log(error);
	}
})


// gets run when metamask is connected
const init = () => {
	smartContract = new ethers.Contract(contractAddress, contractAbi, provider)
	getAddress().then(() => getOwnWallet())
	getCost()
}

async function getAddress () {
	address = await signer.getAddress()
}

async function getCost () {

	cost = ethers.utils.formatEther(await smartContract.cost())}

// get holdings of walletowner, create links and output images
async function getOwnWallet (appended = false) {
	const walletOfOwner = await smartContract.connect(signer).walletOfOwner(address)
	uriList = []
	for (let i = 0; i <= walletOfOwner.length - 1; i++) {
		uriList[i] = await smartContract.connect(signer).tokenURI(walletOfOwner[i])
	}
	if (!appended) {
		uriList.forEach(element => {
			createAppendImg(element)	
		});
	} else {
		let imgCollection = $(".ownNftsWrapper figure img") 
		let expectedEl = imgCollection[imgCollection.length - appended]
		let expectedImg = $(expectedEl).last().attr("src")
		let currentImg = uriList[uriList.length - appended].replace("metadata", "images").replace(".json", ".png")
		// checking if newest nft already has been loaded
		if (expectedImg == currentImg) {
			setTimeout(() => {
				getOwnWallet(appended)
			}, 1000);
		} else {
			// if not false, appended equals amount of minted elements
			for (appended; appended > 0; appended--) {
				createAppendImg(uriList[uriList.length - appended])
			}
		}
	}
}

function createAppendImg(element) {
	let split = element.split("/")
	let name = decodeURIComponent(split[split.length - 1].split(".json")[0])
	let img = "<figure><img src='" + element.replace("metadata", "images").replace(".json", ".png") + "' title='" + name + "' alt='Image of NFT " + name + "' /><figcaption>" + name + "</figcaption></figure>"
	$(".ownNftsWrapper").append(img)
}
