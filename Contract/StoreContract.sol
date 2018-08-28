pragma solidity ^0.4.24;

contract RoContract {

    mapping (string => bytes32) private packIds; //stored by id
    mapping(address => bytes32[]) private scientistROs;
    mapping (bytes32 => bool) private roStore; // stored by ipfs hash digest


    struct AggResource{
        bytes32 ipfsDigest;
        string resourceRole;
    }

    mapping(bytes32 => bool) private rscStore;
    mapping(bytes32 => AggResource[]) private roRSCss;
    mapping(bytes32 => mapping(string => bool)) private rscOwnership;

    enum ValidationRslt{VALID, NOT_VALID, NEW_RSC} ValidationRslt validationRslt;

    function setRoID(string id, bytes32 ipfsAddress) public {

       packIds[id] = ipfsAddress;
    }


    function uploadRo( bytes32 ipfsAddress) public {
       if(roStore[ipfsAddress]){
         return;
       }
        roStore[ipfsAddress] =  true ;
    }


    function addScietistRO(bytes32 roDigest) public{

    scientistROs[msg.sender].push( roDigest);
    }

    function getNumberofPacs(address scientist) public constant returns (uint) {
        return scientistROs[scientist].length;
    }

    function isRoLoaded(bytes32 roDigest) public constant returns (bool){
        return (roStore[roDigest]);
    }

    function validateResource(bytes32 rcsIpfsDigest, string owner) public constant  returns (ValidationRslt){

        if (!rscStore[rcsIpfsDigest]){
            return ValidationRslt.NEW_RSC;
        }

        if (rscOwnership[rcsIpfsDigest][owner]){
            return ValidationRslt.VALID;
        }
    return ValidationRslt.NOT_VALID;

    }

    function addNewRsc(bytes32 digest) public{
       rscStore[digest] =  true;
    }
    function addScientisRsc(bytes32 digest, string owner) public{
       rscOwnership[digest][owner] =  true;
    }

    function addRoRsc(bytes32 roIPFSDigest, bytes32 rscIPFSDigest, string role) public {

        roRSCss[roIPFSDigest].push(AggResource(rscIPFSDigest, role));
    }

    function getRsc(bytes32 rscIPFSDigest, string owner)public view returns(bool){
        return rscOwnership[rscIPFSDigest][owner];
    }

    function isRscLoaded(bytes32 rscDigest) public constant returns(bool){

        return rscStore[rscDigest];
    }

    function getNumberofRcsPerPac(bytes32 roDigest) public constant returns(uint){

        return roRSCss[roDigest].length;
    }


    function getROPurpose(string preID, bytes32 newDigest)public constant returns(string){

        bool isRcsChanged = false;
        for(uint i = 0 ; i < roRSCss[packIds[preID]].length ;i++ ){
            for(uint j= 0 ; j< roRSCss[newDigest].length; j++){

                if (pacContainsRcs(packIds[preID], roRSCss[newDigest][i].ipfsDigest)){
                    continue;
                }else{
                    isRcsChanged = true;
                    if(keccak256(roRSCss[packIds[preID]][i].resourceRole) == keccak256("process")){
                        return "Modified";
                    }
                }
            }
        }
        if(isRcsChanged){
            return "reused";
        }else{
            return "repreduced";
        }
    }


    function pacContainsRcs(bytes32 pacDigest, bytes32 rcsDigest) public constant returns (bool){


        for (uint i = 0 ; i< roRSCss[pacDigest].length; i++)
        {
            if (roRSCss[pacDigest][i].ipfsDigest == rcsDigest){
                return true;
            }
        }

        return false;
    }

    event AddRoRsc(address, string rscHash, string roHash);
    event AddNewRsc(address, string rscIPFS, string rscOwner);
    event NewChange(address account, string newRO, string oldRO, string changePurpoe);
    event CreateRO(address account, string packId, string ipfsHash);
    event RejectRO(address account, string roId, string roDigest, string message);

    function logAddRoRsc(string rscHash, string packId)public{
        emit AddRoRsc( msg.sender,  rscHash,  packId);
    }

    function logAddNewRsc(string rscIPFS, string rscOwner)public{
        emit AddNewRsc( msg.sender,  rscIPFS,  rscOwner);
    }

    function logNewChange(string newROId, string oldROId, string changePurpose)public{
        emit NewChange(msg.sender, newROId, oldROId, changePurpose);
    }

    function logCreateRO(string packId, string ipfsHash)public{
        emit CreateRO(msg.sender, packId,  ipfsHash);
    }

    function logRejectRO(string roId, string roDigest, string message)public{
        emit RejectRO(msg.sender, roId, roDigest, message);
    }



}
