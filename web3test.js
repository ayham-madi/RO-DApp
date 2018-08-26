var solc = require('solc');
var Web3 = require('web3');
var fs = require('fs');
const bs58 = require('bs58');

//var manifestJSON = JSON.parse(fs.readFileSync('test cases/Case 1/manifest.json', 'utf8'));
//var manifest2JSON = JSON.parse(fs.readFileSync('test cases/Case 1/Evolved_manifest.json', 'utf8'));
//var allManifests = [manifestJSON, manifest2JSON]

var manifestJSON = JSON.parse(fs.readFileSync('test cases/Case 2/manifest.json', 'utf8'));
var manifest2JSON = JSON.parse(fs.readFileSync('test cases/Case 2/reused_manifest.json', 'utf8'));
var manifest3JSON = JSON.parse(fs.readFileSync('test cases/Case 2/repreduced_manifest.json', 'utf8'));
var manifest4JSON = JSON.parse(fs.readFileSync('test cases/Case 2/modified_manifest.json', 'utf8'));

var allManifests = [manifestJSON, manifest2JSON];


//var manifestJSON = JSON.parse(fs.readFileSync('test cases/Case 3/manifest.json', 'utf8'));
//var invslifManifestJSON = JSON.parse(fs.readFileSync('test cases/Case 3/invalid_manifest.json', 'utf8'));

//var allManifests = [manifestJSON, invslifManifestJSON];

if (typeof web3 !== 'undefined') {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}
var addr = ('0x7748441efde3970f01d6cf660751f9d188702590');
var defaultAccount = web3.eth.defaultAccount ="7748441efde3970f01d6cf660751f9d188702590";

web3.eth.defaultAccount =defaultAccount;

var defaultAccount = web3.eth.defaultAccount ="7748441efde3970f01d6cf660751f9d188702590";

web3.eth.defaultAccount =defaultAccount;

var filepath = 'Contract/StoreContract.sol';

var input = fs.readFileSync(filepath).toString();

var output = solc.compile(input, 1); // 1 activates the optimiser

for (var contractName in output.contracts) {

var byteCode = '0x' + output.contracts[contractName].bytecode;
abi = JSON.parse(output.contracts[contractName].interface);
var myContract = new web3.eth.Contract(abi,{from: addr, gasPrice: '2100000'});

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
var k;
for(k = 0 ; k < allManifests.length ; k++){

  console.log("UPLOADED PACKAGE: "+allManifests[k].id);

  var rodigest = getBytes32FromMultiash(allManifests[k].IPFSHash.toString());
  var isPackLoaded;
  await newContractInstance.methods.isRoLoaded(rodigest).call().then(async function(receipt){console.log("isRoLoaded receipt: "+receipt); isPackLoaded = receipt;});
  if(isPackLoaded){
    await newContractInstance.methods.logRejectRO(allManifests[k].id, allManifests[k].IPFSHash, "Package is already uploaded!!" ).send();
    throw "Package is already uploaded!!";
  }
  for (i=0; i< allManifests[k].aggregates.length;i++){
    var rscdigest = getBytes32FromMultiash(allManifests[k].aggregates[i].IPFSHash.toString());
    // Validate the owner of the aggregated resource
    await newContractInstance.methods.validateResource(rscdigest, allManifests[k].aggregates[i].owner).call().then(async function(receipt)
    { if(receipt ==1 ){

      await newContractInstance.methods.logRejectRO("id", "IPFSHash", "this resource "+123 +" is not cited properly!!" ).send();
      throw "this resource "+allManifests[k].aggregates[i].IPFSHash +" is not cited properly!!";
    }
  });
  }

  //Uploading new Package
  await newContractInstance.methods.uploadRo(allManifests[k].id, rodigest, allManifests[k].previousRO ).send();
  await newContractInstance.methods.logCreateRO(allManifests[k].id, rodigest).send();
  //Adding resources .....
  var i;
  for (i=0; i< allManifests[k].aggregates.length;i++){
  var rscdigest = getBytes32FromMultiash(allManifests[k].aggregates[i].IPFSHash.toString());

  var isLoaded;
  await newContractInstance.methods.isRscLoaded(rscdigest).call().
  then(async function(receipt){console.log("isRscLoaded receipt: "+receipt); isLoaded = receipt;});
  if(!isLoaded){

  console.log("adding new Resource" + allManifests[k].aggregates[i].IPFSHash);
  await newContractInstance.methods.addNewRsc(rscdigest ).send().then(async function(){
  await newContractInstance.methods.addScientisRsc(rscdigest, allManifests[k].aggregates[i].owner).send();
  });
  }
  // adding rsc to ro package
  await newContractInstance.methods.addRoRsc(rodigest, rscdigest,  allManifests[k].aggregates[i].ResourceCategory).send();
  await newContractInstance.methods.logAddRoRsc(allManifests[k].aggregates[i].IPFSHash, allManifests[k].id).send();
 }

  await newContractInstance.methods.addScietistRO(rodigest).send();

  if(allManifests[k].previousRO ==""){
      console.log(allManifests[k].previousRO + "New Package");
    }else if (allManifests[k].isEvolved !=0){
      console.log("Evolved!!");
    }else{
      await newContractInstance.methods.getROPurpose( allManifests[k].previousRO , rodigest).call()
      .then(async function(receipt){
        console.log("getROPurpose receipt: "+receipt);
        await newContractInstance.methods.logNewChange(allManifests[k].id, allManifests[k].previousRO, receipt).send();

      });

    }
}

newContractInstance.getPastEvents("CreateRO",{
    filter: {},
    fromBlock: 0,
    toBlock: 'latest'
}, async function(error, event){ }).then(function(event){
  console.log("*********************CreateRO************************");

  var n ;
  for (n=0;n< event.length; n++ ){
  console.log("event: "+ event[n].event +
   "\nScientist account: "+event[n].returnValues[0] +
   "\nPackage Id: "+event[n].returnValues[1]+
   "\nPackage Hash: "+event[n].returnValues[2]+
   "\nsignature: "+event[n].signature);
 }
});



newContractInstance.getPastEvents("AddRoRsc",{
    filter: {},
    fromBlock: 0,
    toBlock: 'latest'
}, async function(error, event){ }).then(function(event){
  console.log("*********************AddRoRsc************************");
  var n ;
  for (n=0;n< event.length; n++ ){
  console.log("event: "+ event[n].event +
   "\nScientist account: "+event[n].returnValues[0] +
   "\nResource hash: "+event[n].returnValues[1]+
   "\nPackage Id: "+event[n].returnValues[2]+
   "\nsignature: "+event[n].signature);
 }
});


newContractInstance.getPastEvents("NewChange",{
    filter: {},
    fromBlock: 0,
    toBlock: 'latest'
}, async function(error, event){ }).then(function(event){
console.log("*********************NewChange************************");
  var n ;
  for (n=0;n< event.length; n++ ){
  console.log("event: "+ event[n].event +
   "\nPackage ID: "+event[n].returnValues[0] +
   "\nPrev Pacakge ID: "+event[n].returnValues[1]+
   "\nPurpose: "+event[n].returnValues[2]+
   "\nsignature: "+event[n].signature);
 }
});

}).catch(function(error){console.log(error);
  myContract.getPastEvents("RejectRO",{
      fromBlock: 0,
      toBlock: 'latest'
  }, async function(error, event){ console.log("event: "+event); });



});
}

function getBytes32FromMultiash(multihash) {

  const decoded = bs58.decode(multihash);
  if(multihash === ""){
    return `0x`;
  }
  return  `0x${decoded.slice(2).toString('hex')}`;
}
