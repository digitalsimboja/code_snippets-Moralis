Moralis.initialize("OQvfFjndjsVVeXjqploBBzf0cTFa90shSgUi65AF"); //Server url from moralis.io
Moralis.serverURL = "https://7dnpxaqmgrdv.usemoralis.com:2053/server"; // Application id from moralis.io

let currentTrade = {};
let currentSelectSide;
let tokens;

async function init() {
  await Moralis.initPlugins();
  await Moralis.enableWeb3();
  await listAllAvailableTokens();
  currentUser = Moralis.User.current();
  if (currentUser) {
    document.getElementById("swap_button").disabled = false;
  }
  
 
}

async function listAllAvailableTokens() {
  const result = await Moralis.Plugins.oneInch.getSupportedTokens({
    chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
  });
 
  tokens = result.tokens;

  let parent = document.getElementById('token_list');
  for (const address in tokens) {
    let token = tokens[address]
    // Create the structure of the HTML
    let div = document.createElement('div');
    div.setAttribute("data-address", address)
    div.className = "token_row";
    let html = `
    <img class = "token_list_img" src = "${token.logoURI}">
    <span class = "token_list_text">${token.symbol}</spand>
    `
    div.innerHTML = html;
    div.onclick  = (() => {selectToken(address)});
    
    parent.appendChild(div);
   
  }
  

}

function selectToken(address){
  closeModal();
  // let address = event.target.getAttribute("data-address");
  currentTrade[currentSelectSide] = tokens[address];
  renderInterface();
  getQuote();
}

function renderInterface(){
  if (currentTrade.from) {
    document.getElementById('from_token_text').innerHTML = currentTrade.from.symbol;
    document.getElementById('from_token_img').src = currentTrade.from.logoURI;
  }
  if (currentTrade.to) {
    document.getElementById('to_token_text').innerHTML = currentTrade.to.symbol;
    document.getElementById('to_token_img').src = currentTrade.to.logoURI;
  }

  
}

async function login() {
  try {
    currentUser = Moralis.User.current();
    if (!currentUser) {
      currentUser = await Moralis.authenticate();
    }
    document.getElementById("swap_button").disabled = false;
  } catch (error) {
    console.log(error);
  }
}

function openModal(side) {
  currentSelectSide = side;
  document.getElementById("token_modal").style.display = "block";
}

function closeModal() {
    document.getElementById("token_modal").style.display = "none";
}

async function getQuote() {
  // ensure the currentrade is set
  if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;
  //get the price of the from_amount token from 1Inch
  // display the price
  let amount = Number(
    document.getElementById("from_amount").value * 10**currentTrade.from.decimals
    ) ;
  const quote = await Moralis.Plugins.oneInch.quote({
    chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: currentTrade.from.address, // The token you want to swap
    toTokenAddress: currentTrade.to.address, // The token you want to receive
    amount: amount,
  });
  console.log(quote);
  document.getElementById("to_amount").value = quote.toTokenAmount / (10**quote.toToken.decimals);
  document.getElementById("gas_estimate").innerHTML = quote.estimatedGas;


}

async function trySwap() {
  let address = Moralis.User.current().get("ethAddress");
  let amount = Number(
    document.getElementById("from_amount").value * 10**currentTrade.from.decimals
  );
  if (currentTrade.from.symbol !== "ETH") {
    const allowance = await Moralis.Plugins.oneInch.hasAllowance({
      chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
      fromTokenAddress: currentTrade.from.address, // The token you want to swap
      fromAddress: address, // Your wallet address
      amount: amount,
    });
    if (!allowance){
      await Moralis.Plugins.oneInch.approve({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
        tokenAddress: currentTrade.from.address, // The token you want to swap
        fromAddress: address, // Your wallet address
      });

    }   
  }
  
  let receipt = await doSwap(amount, address);
  alert('Swap completed', receipt);
}

async function doSwap(amount, userAddress) {
  return Moralis.Plugins.oneInch.swap({
    chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: currentTrade.from.address, // The token you want to swap
    toTokenAddress: currentTrade.to.address, // The token you want to receive
    amount:  amount,
    fromAddress: userAddress, // Your wallet address
    slippage: 1,
  });
}
 
init();

document.getElementById("from_token_select").onclick = (() => {
  openModal("from");
} );
document.getElementById("modal_close").onclick = closeModal;
document.getElementById("to_token_select").onclick = () => {
  openModal("to");
};
document.getElementById("login_button").onclick = login;
document.getElementById("from_amount").onblur = getQuote;
document.getElementById("swap_button").onclick = trySwap;
