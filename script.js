import { ethers } from "./js/ethers-5.2.esm.min.js";

var provider, signer, address, smartContract, cost, connected, uriList, supply, revealed, owner

// base url for pulling imgs
const baseUrl = "https://nft.derschwarzejugo.com/schnabeltiere/metadata/Fat%20Plat%20%23"

// smart contract
const contractAddress = "0x309e1C704a2F1F5bfD886Fe8823DE67a84c2da01"

// declared functions which you want to use of the contract (not necessairly all)
const contractAbi = [
	"function mint(address _to, uint256 _mintAmount) public payable",
	"function tokenURI(uint256 tokenId)	public view	returns (string)",
	"function walletOfOwner(address _owner)	public view returns (uint256[])",
	"function cost() public view returns (uint256)",
	"function totalSupply() public view returns (uint256)",
	"function owner() public view returns(address)"
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
		$('#status').html('Please install or allow Metamask!!')
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
		$('#status').html('Please install or allow Metamask!!')
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
		await smartContract.connect(signer).mint(address, amount, overrides)
			.then(() => getOwnWallet(amount))
			.then(() => getImgToMint(amount))
	} catch (error) {
		$("#status").html(error.data.message)
		console.log(error);
	}
})

$("#loadMore").on("click", async () => {
	let interval = revealed + 20
	for (revealed; revealed < interval; revealed++) {
		let element = baseUrl + revealed + ".json"
		createAppendImg(element, $(".mintedNftsWrapper"), true)
	}	
})


// gets run when metamask is connected
const init = () => {
	smartContract = new ethers.Contract(contractAddress, contractAbi, provider)
	getAddress()
		.then(() => getOwnWallet())
		.then(() => getSupply())
		.then(() => getImgToMint())
		.then(() => checkIfOwner())
	getCost()
}

async function getAddress () {
	try {
		address = await signer.getAddress()
	} catch (error) {
		console.log(error)
	}
}

async function checkIfOwner () {
	try {
		owner = await smartContract.connect(address).owner()
		if (owner == address) {
			cost = 0	
		}
	} catch (error) {
	}
}

async function getCost () {
	try {
		cost = ethers.utils.formatEther(await smartContract.cost())
		let innerText = "Current price: " + cost + " MATIC"
		$("#nftCost").text(innerText)
	} catch (error) {
		console.log(error)
	}
}

async function getImgToMint(amount = false) {
	if ($(".ownNfts").length > 0) {
		try {
			let innerSupply = await smartContract.connect(address).totalSupply()
			let element = baseUrl + innerSupply + ".png"
			let split = element.split("/")
			let name = decodeURIComponent(split[split.length - 1].replace(".png", ""))
			let src = element.replace("metadata", "images") 
			let img = "<figure><img src='" + src + "' title='" + name + "' alt='Image of NFT " + name + "'><figcaption>Claim your " + name + " right now!</figcaption></figure>"
			if(amount && amount > 0) {
				if(src == $("#nftCost").prev().find("img").attr("src")) {
					getImgToMint(amount)
				} else {
					$("#nftCost").prev().remove()
					$("#nftCost").parent().prepend(img)	
				}
			} else {
				$("#nftCost").parent().prepend(img)	
			}
		} catch (error) {
			console.log(error)	
		}
	}
}

async function getSupply() {
	if ($(".mintedNfts").length > 0) {
		try {
			supply = await smartContract.connect(address).totalSupply()
			supply = supply.toNumber()
			for (let i = 0; i < supply; i++) {
				let element = baseUrl + i + ".json"
				createAppendImg(element, $(".mintedNftsWrapper"))
			}
			setTimeout(() => {
				if (!revealed > 0) {
					revealed = supply
				}
				let interval = revealed + 20
				for (revealed; revealed < interval; revealed++) {
					let element = baseUrl + revealed + ".json"
					createAppendImg(element, $(".mintedNftsWrapper"), true)
				}
			}, 1000);

		} catch (error) {
			console.log(error)
		}
	}
}


// get holdings of walletowner, create links and output images
async function getOwnWallet (appended = false) {
	if ($(".ownNfts").length > 0) {
		try {
			const walletOfOwner = await smartContract.connect(signer).walletOfOwner(address)
			uriList = []
			for (let i = 0; i <= walletOfOwner.length - 1; i++) {
				try {
					uriList[i] = await smartContract.connect(signer).tokenURI(walletOfOwner[i])
				} catch (error) {
					console.log(error)
				}
			}
			if (!appended) {
				uriList.forEach(element => {
					createAppendImg(element, $(".ownNftsWrapper"))	
				});
			} else {
				let imgCollection = $(".ownNftsWrapper figure img") 
				let expectedEl = imgCollection[imgCollection.length - appended]
				let expectedImg = $(expectedEl).attr("src")
				let currentImg = uriList[uriList.length - appended].replace("metadata", "images").replace(".json", ".png")
				// checking if newest nft already has been loaded
				if (expectedImg == currentImg) {
					setTimeout(() => {
						getOwnWallet(appended)
					}, 1000);
				} else {
					// if not false, appended equals amount of minted elements
					for (appended; appended > 0; appended--) {
						createAppendImg(uriList[uriList.length - appended], $(".ownNftsWrapper"))
					}
				}
			}
		} catch (error) {
			console.log(error)
		}
	}
}

function createAppendImg(element, wrapper, filtered = false) {
	let split = element.split("/")
	let name = decodeURIComponent(split[split.length - 1].split(".json")[0])
	let img = "<figure><img " + (filtered ? "class='filtered'" : "") + " src='" + element.replace("metadata", "images").replace(".json", ".png") + "' title='" + name + "' alt='Image of NFT " + name + "' /><figcaption>" + name + "</figcaption></figure>"
	wrapper.append(img)
}
