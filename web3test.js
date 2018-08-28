var solc = require('solc');
var Web3 = require('web3');
var fs = require('fs');
const bs58 = require('bs58');

var manifestJSON = JSON.parse(fs.readFileSync('test cases/Case 1/manifest.json', 'utf8'));
var manifest2JSON = JSON.parse(fs.readFileSync('test cases/Case 1/Evolved_manifest.json', 'utf8'));
var allManifests = [manifestJSON, manifest2JSON]
////
//var manifestJSON = JSON.parse(fs.readFileSync('test cases/Case 2/manifest.json', 'utf8'));
//var manifest2JSON = JSON.parse(fs.readFileSync('test cases/Case 2/reused_manifest.json', 'utf8'));
//var manifest3JSON = JSON.parse(fs.readFileSync('test cases/Case 2/repreduced_manifest.json', 'utf8'));
//var manifest4JSON = JSON.parse(fs.readFileSync('test cases/Case 2/modified_manifest.json', 'utf8'));

//var manifestJSON = JSON.parse(fs.readFileSync('test cases/Case 3/manifest.json', 'utf8'));
//var invslifManifestJSON = JSON.parse(fs.readFileSync('test cases/Case 3/invalid_manifest.json', 'utf8'));
//var invslifManifest2JSON = JSON.parse(fs.readFileSync('test cases/Case 3/invalid_manifest2.json', 'utf8'));

//var allManifests = [manifestJSON, invslifManifest2JSON, invslifManifestJSON];

if (typeof web3 !== 'undefined') {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}
 var addr = ('0xdd7e5841765c07d3b4cb6e92fb7487e7208f5384');
var defaultAccount = web3.eth.defaultAccount ="dd7e5841765c07d3b4cb6e92fb7487e7208f5384";

web3.eth.getBalance(addr, function (error, result) {
	if (!error)
    console.log(result)
	else
		console.log( error);
});

web3.eth.defaultAccount =defaultAccount;

var filepath = 'Contract/StoreContract.sol';


var purpose;

var input = fs.readFileSync(filepath).toString();

var output = solc.compile(input, 1); // 1 activates the optimiser

for (var contractName in output.contracts) {
var byteCode = '0x' + output.contracts[contractName].bytecode;
abi = JSON.parse(output.contracts[contractName].interface);
var myContract = new web3.eth.Contract(abi,{from: addr, gasPrice: '2000000'});

var deployContract = myContract.deploy({data:byteCode});

deployContract.send({from:web3.eth.coinbase, data:byteCode, gas: 2000000},function(error, transactionHash){ })
.on('error', function(error){  })
.on('transactionHash', function(transactionHash){ })
.on('receipt', function(receipt){
   console.log(receipt.contractAddress);
   myContract.options.address = receipt.contractAddress;
})
.on('confirmation', function(confirmationNumber, receipt){  })
.then(async function(newContractInstance){

//allManifests.forEach(async function(allManifests[k]){
allManifests:
for(var k = 0 ; k < allManifests.length ; k++){


  console.log("UPLOADED PACKAGE: "+allManifests[k].id);

  var rodigest = getBytes32FromMultiash(allManifests[k].IPFSHash.toString());

  var isPackValid;
  await newContractInstance.methods.isRoLoaded(rodigest).call().then(async function(receipt){console.log("isRoLoaded receipt: "+receipt); isPackLoaded = receipt;});

  if(isPackLoaded){
    await newContractInstance.methods.logRejectRO(allManifests[k].id, allManifests[k].IPFSHash, "Package is already uploaded!!" ).send();
    continue allManifests;
  }
  var invalidRSC;

  for (i=0; i< allManifests[k].aggregates.length;i++){

    var rscdigest = getBytes32FromMultiash(allManifests[k].aggregates[i].IPFSHash.toString());
    // Validate the owner of the aggregated resource
    await newContractInstance.methods.validateResource(rscdigest, allManifests[k].aggregates[i].owner).call().then(async function(receipt){
       if(receipt ==1 ){
      isPackLoaded = receipt;
      invalidRSC = allManifests[k].aggregates[i].IPFSHash;

    }
  });
}

if(isPackLoaded){
  await newContractInstance.methods.logRejectRO(allManifests[k].id, allManifests[k].IPFSHash, "Resource "+invalidRSC+ " is not cited properly!!" ).send();
  continue allManifests;
}

  //Uploading new Package


  await newContractInstance.methods.uploadRo( rodigest ).send({from: addr}).then(async function(){
    await newContractInstance.methods.setRoID(allManifests[k].id, rodigest).send({from: addr});
  });

  await newContractInstance.methods.logCreateRO(allManifests[k].id, allManifests[k].IPFSHash).send({from: addr});
  //Adding resources .....
  var i;
  for (i=0; i< allManifests[k].aggregates.length;i++){
  var rscdigest = getBytes32FromMultiash(allManifests[k].aggregates[i].IPFSHash.toString());

  var isLoaded;
  await newContractInstance.methods.isRscLoaded(rscdigest).call({from: addr}).
  then(async function(receipt){console.log("isRscLoaded receipt: "+receipt); isLoaded = receipt;});
  if(!isLoaded){

  console.log("adding new Resource" + allManifests[k].aggregates[i].IPFSHash);
  await newContractInstance.methods.addNewRsc(rscdigest ).send({from: addr}).then(async function(){
  await newContractInstance.methods.addScientisRsc(rscdigest, allManifests[k].aggregates[i].owner).send({from: addr});
  });
  }
  // adding rsc to ro package
  await newContractInstance.methods.addRoRsc(rodigest, rscdigest,  allManifests[k].aggregates[i].ResourceCategory).send({from: addr});
  await newContractInstance.methods.logAddRoRsc(allManifests[k].aggregates[i].IPFSHash, allManifests[k].id).send({from: addr});
 }

  await newContractInstance.methods.addScietistRO(rodigest).send({from: addr});


  if(allManifests[k].previousRO ==""){
      console.log(allManifests[k].previousRO + "New Package");
      purpose = "New Package";
    } else {  if (allManifests[k].isEvolved !=0){
      console.log("Evolved");
      purpose = "Evolved Package";
    }else{
      await newContractInstance.methods.getROPurpose( allManifests[k].previousRO , rodigest).call({from: addr})
      .then(async function(receipt){
        console.log("getROPurpose receipt: "+receipt);
        purpose = receipt+" Package";
      });
    }
    await newContractInstance.methods.logNewChange(allManifests[k].id, allManifests[k].previousRO, purpose).send({from: addr});
  }

}

await newContractInstance.getPastEvents("CreateRO",{
    filter: {},
    fromBlock: 0,
    toBlock: 'latest'
}, async function(error, event){ }).then( async function(event){
  console.log("********************* Create RO ************************");

  var n ;
  for (n=0;n< event.length; n++ ){
  console.log("event: "+ (n+1) +
   "\nScientist account: "+event[n].returnValues[0] +
   "\nPackage Id: "+event[n].returnValues[1]+
   "\nPackage Hash: "+event[n].returnValues[2]+
   "\nTransaction Hash: "+event[n].transactionHash+
   "\nBlock number"+ event[n].blockNumber);
  await web3.eth.getTransaction(event[n].transactionHash).then( async function(result){
     console.log("signature: {\n \t v: " +result.v+
     "\n \t r: "+ result.r+
     "\n \t s: "+ result.s+"\n}"
   );
   });

 }
});



await newContractInstance.getPastEvents("AddRoRsc",{
    filter: {},
    fromBlock: 0,
    toBlock: 'latest'
}, async function(error, event){ }).then(async function(event){
  console.log("*********************AddRoRsc************************");
  var n ;
  for (n=0;n< event.length; n++ ){
    console.log("event: "+ (n+1) +
   "\nScientist account: "+event[n].returnValues[0] +
   "\nResource hash: "+event[n].returnValues[1]+
   "\nPackage Id: "+event[n].returnValues[2]+
   "\nTransaction Hash: "+event[n].transactionHash);
   await web3.eth.getTransaction(event[n].transactionHash).then( async function(result){
   console.log("signature: {\n \t v: " +result.v+
   "\n \t r: "+ result.r+
   "\n \t s: "+ result.s+"\n}"
 );
 });
  }
});


await newContractInstance.getPastEvents("NewChange",{
    filter: {},
    fromBlock: 0,
    toBlock: 'latest'
}, async function(error, event){ }).then( async function(event){
console.log("********************* Consumed Package Purpose ************************");
  var n ;
  for (n=0;n< event.length; n++ ){
    console.log("event: "+ (n+1) +
   "\nScientist account: "+event[n].returnValues[0] +
   "\nPackage ID: "+event[n].returnValues[1] +
   "\nPrev Pacakge ID: "+event[n].returnValues[2]+
   "\n"+event[n].returnValues[3]+
   "\nTransaction Hash: "+event[n].transactionHash);

   await web3.eth.getTransaction(event[n].transactionHash).then( async function(result){
   console.log("signature: {\n \t v: " +result.v+
   "\n \t r: "+ result.r+
   "\n \t s: "+ result.s+"\n}");
   });


 }
});



await newContractInstance.getPastEvents("RejectRO",{
    filter: {},
    fromBlock: 0,
    toBlock: 'latest'
}, async function(error, event){ }).then( async function(event){
console.log("********************* RejectRO ************************");
  var n ;
  for (n=0;n< event.length; n++ ){
    console.log("event: "+ (n+1) +
    "\nScientist account: "+event[n].returnValues[0]+
    "\nPackage Id: "+event[n].returnValues[1]+
    "\nPackage Hash: "+event[n].returnValues[2]+
    "\nMessage: "+event[n].returnValues[3]
      );
    }
  });



}).catch(function(error){
  console.log(error);
});
}





function getBytes32FromMultiash(multihash) {

  const decoded = bs58.decode(multihash);
  if(multihash === ""){
    return `0x`;
  }
  return  `0x${decoded.slice(2).toString('hex')}`;
}
