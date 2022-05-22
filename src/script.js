// import adapter from '../node_modules/webrtc-adapter';
import AgoraRTM from 'agora-rtm-sdk';

let APP_ID="4f13e7ff05ee403b907da0f50bf50bb1";

// authentication.
// token created from a web app. Deploy your own for production servers
let token="0064f13e7ff05ee403b907da0f50bf50bb1IAA4JCiR6Imlc6tOOZTyO4O4I9PG0EnHnvJtugoLC7ZJmAx+f9gAAAAAEAALSwH7UQmLYgEA6ANRCYti";

// userid
// let uid=String(Math.floor(Math.random()*10000))
// let uid=(Math.random()*10).toString(16).substring(2,12);
let uid="test";



// client object logged in with.
let client;

// create a channel between the users.
let channel;

let localStream;
let remoteStream;
let peerConnection;

let queryString=window.location.search;
let urlParams=new URLSearchParams(queryString);
let roomId=urlParams.get("room");

if(!roomId){
    window.location='lobby.html';
}


// requesting access to our camera and audio device at the load.

const servers={
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

const init=async()=>{
    // create and return an RTM  client instance.
    client=await AgoraRTM.createInstance(APP_ID,{enableLogUpload:true});
    
    // login auth
    await client.login({uid,token});

    // room id(channel) e.g index.html?room=1243432
    channel=client.createChannel("main");
    
    // join the channel.
    await channel.join();

    // event listener that other member joins.
    channel.on("MemberJoined", handleuserJoined);

    // message from peer. Respond tothe message
    client.on("MessageFromPeer", handleMessageFromPeer);
    localStream= await navigator.mediaDevices.getUserMedia({video:true, audio:true});
    document.getElementById("peer-A").srcObject=localStream;
    createOffer();
}

// handle user message sent event.
const handleMessageFromPeer=async(message, MemberId)=>{
    message=JSON.parse(message.text);
    console.log("message :", message);
}

// handle user joined event
const handleuserJoined=async(MemberId)=>{
    console.log(" A new user joined the channel", MemberId);
    createOffer(MemberId);
}
// create ICE candidates.

const createPeerConnection=async(MemberId)=>{
    peerConnection=new RTCPeerConnection(servers);

    // create a mediaStream object
    remoteStream=new MediaStream();

    document.getElementById("peer-B").srcObject=remoteStream;
    
    if(!localStream){
        localStream=await navigator.mediaDevices.getUserMedia({video:true, audio:true});
        document.getElementById("peer-A").srcObject=localStream;
    }

    // add media traks to the SDP metadata.
    localStream.getTracks().forEach((track)=>{
        peerConnection.addTrack(track, localStream);
    })
    // listen for when our peer adds their tracks too.
    peerConnection.ontrack=(e)=>{
        e.streams[0].getTracks().forEach((track)=>{
            remoteStream.addTrack(track);
        });
    }

    // create ICE candidates when setLocalDescription is set.
    peerConnection.onicecandidate=async(e)=>{
        if(e.candidate){
            console.log("New ICE candidate ",e.candidate );
            // sendover the ICe candisates
            // client.sendMessageToPeer({text:JSON.stringify({"type":"candidate", "candidate":e.candidate})},MemberId);
        }
    }

}
let createOffer=async(MemberId)=>{
    await createPeerConnection(MemberId);

    let offer=await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    console.log("Offer: ", offer);
    // send message to peer with the member ID
    client.sendMessageToPeer(
        {text:JSON.stringify({"type":"offer", "offer":offer})},MemberId
        ).then(sendResult=>{
            if(sendResult.hasPeerReceived){
                console.log("Peer recieved the message!")
            }else{
                console.log("Server is fine but peer didn't revceive message!")
            }
        }).catch(error=>{
            console.log(error.message);
        })
    
}
init();