import { ethers } from "./js/ethers-5.2.esm.min.js";

var provider, signer, address, smartContract, separateProvider, separateContract, cost, connected, uriList, supply, revealed, owner, whitelisted, baseUrl

// smart contract
const contractAddress = "0xEEB3c9DA6FD8E00420Fe2792F20bA7EAD2ad4a39"

// network rpc url
const networkUrl = "https://polygon-rpc.com/"

// declared functions which you want to use of the contract (not necessairly all)
const contractAbi = [
	"function mint(address _to, uint256 _mintAmount) public payable",
	"function tokenURI(uint256 tokenId)	public view	returns (string)",
	"function walletOfOwner(address _owner)	public view returns (uint256[])",
	"function cost() public view returns (uint256)",
	"function totalSupply() public view returns (uint256)",
	"function owner() public view returns(address)",
	"function whitelisted(address _address) public view returns (bool)",
	"function baseTokenURI() public view returns (string memory)"
]

let connectInterval = setInterval(() => {
	if (connected) {
		$(".hidden").removeClass('hidden')
		$("#connectMetamask").addClass('hidden')
		clearInterval(connectInterval)
	}
}, 1000)



// listeners
$(window).on("load", async () => {
	// wait to fetch contract base address
	await callSeparateProvider()
		.then(() => getImgToMint())
		.then(() =>	$(".hidden").removeClass('hidden'))
		.then(() => getSupply())
	
	if (!window.ethereum) {
		$('#status').html('Connect your MetaMask now to see current price and mint your own Fat Plat.')
	} else {
		provider = new ethers.providers.Web3Provider(window.ethereum)
		signer = provider.getSigner()
		try {
			await signer.getAddress()	
			connected = true
			$("body").addClass('connected')
			init()
		} catch (error) {
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
		$('#status').html('Connect your MetaMask now to see current price and mint your own Fat Plat.')
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
	let interval = revealed + 25
	for (revealed; revealed < interval; revealed++) {
		let mintedAlready = revealed >= supply
		let element = baseUrl + revealed + ".json"
		createAppendImg(element, $(".mintedNftsWrapper"), mintedAlready)
	}	
})


// gets run when metamask is connected
const init = () => {
	smartContract = new ethers.Contract(contractAddress, contractAbi, provider)
	getAddress()
		.then(() => getOwnWallet())
		.then(() => checkIfOwnerOrWhitelisted())
	getCost()
}

// gets run on jquery.load to provide simple functionality before connecting to metamask
const callSeparateProvider = async () => {
	separateProvider = new ethers.providers.JsonRpcProvider(networkUrl)
	// giving provider to contract = only getters possible
	separateContract = new ethers.Contract(contractAddress, contractAbi, separateProvider).connect(separateProvider)
	baseUrl = await separateContract.baseTokenURI()
}

async function getAddress () {
	try {
		address = await signer.getAddress()
	} catch (error) {
		console.log(error)
	}
}

async function checkIfOwnerOrWhitelisted () {
	try {
		owner = await smartContract.connect(address).owner()
		whitelisted = await smartContract.connect(address).whitelisted(address)
		if (owner == address || whitelisted == true) {
			cost = 0	
		}
	} catch (error) {
		console.log(error)
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
			let innerSupply = await separateContract.totalSupply()
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
			supply = await separateContract.totalSupply()
			supply = supply.toNumber()
			
			if (!revealed > 0)
				revealed = 0
			let interval = revealed + 25
			for (revealed; revealed < interval; revealed++) {
				let mintedAlready = revealed >= supply
				let element = baseUrl + revealed + ".json"
				createAppendImg(element, $(".mintedNftsWrapper"), mintedAlready)
			}

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
			let prevListLength
			if ($.isArray(uriList)) {
				prevListLength = uriList.length
			} else {
				prevListLength = 0
			}
			uriList = []
			for (let i = 0; i <= walletOfOwner.length - 1; i++) {
				try {
					uriList[i] = await smartContract.connect(signer).tokenURI(walletOfOwner[i])
				} catch (error) {
					console.log(error)
				}
			}
			if (!appended) {
				// gets called on load
				uriList.forEach(element => {
					createAppendImg(element, $(".ownNftsWrapper"))	
				});
			} else {
				// gets called after minting with amount in var appended
				if (uriList == undefined || Number(prevListLength) + Number(appended) > uriList.length) {
					setTimeout(() => {
						getOwnWallet(appended)
					}, 1000);
				} else {
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
	let existingImgs = $.map(wrapper.find("figure img"), function(val, i) {
		return $(val).attr("src")
	})
	// $.inArray returns index or -1
	if (existingImgs.length > 0 && $.inArray(element, existingImgs) > -1) {
		// element already exists on the page
	} else {
		// when blockchain confirms, element should be in uriList
		let split = element.split("/")
		let name = decodeURIComponent(split[split.length - 1].split(".json")[0])
		let img = "<figure><img " + (filtered ? "class='filtered'" : "") + " src='" + element.replace("metadata", "images").replace(".json", ".png") + "' title='" + name + "' alt='Image of NFT " + name + "' /><figcaption>" + name + "</figcaption></figure>"
		wrapper.append(img)
		if ($.inArray(element, uriList) > -1) {
		}
	}
}
