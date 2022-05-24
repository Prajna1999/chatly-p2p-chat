// import AgoraRTM from '../agora-rtm-sdk-1.4.4';

let APP_ID="2058297c5b474d2b9d3b9c2174495cfb";

// authentication.
// token created from a web app. Deploy your own for production servers
let token=null;
// userid
let uid="prajna"+(Math.floor(Math.random()*10000)).toString(16);
// let uid=(Math.random()*10).toString(16).substring(2,12);



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
    localStream= await navigator.mediaDevices.getUserMedia({video:true, audio:false});
    document.getElementById("peer-A").srcObject=localStream;
    console.log(uid);

    
}

// handle user message sent event.
const handleMessageFromPeer=async(message, MemberId)=>{
    message=JSON.parse(message.text);
    // console.log("message :", message);
    if(message.type=='offer'){
        // create an answer
        createAnswer(MemberId, message.offer)
    }
    if(message.type=='answer'){
        // add an answer no member id needed. 
        addAnswer(message.answer)
    }

    // both peers will send out candidates. add candidate to peer connection.
    if(message.type==='candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

// handle user joined event
const handleuserJoined=async(MemberId)=>{
    console.log(" A new user joined the channel: ", MemberId);
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
        console.log("e streams are: ",e.streams)
        e.streams[0].getTracks().forEach((track)=>{
            
            remoteStream.addTrack(track);
        });
    }

    // create ICE candidates when setLocalDescription is set.
    peerConnection.onicecandidate=async(e)=>{
        if(e.candidate){
            // console.log("New ICE candidate ",e.candidate );
            // sendover the ICe candisates
            client.sendMessageToPeer({text:JSON.stringify({"type":"candidate", "candidate":e.candidate})},MemberId);
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

// create answer function
let createAnswer=async(MemberId, offer)=>{
    await createPeerConnection(MemberId);
    // remote description offer
    await peerConnection.setRemoteDescription(offer);

    // local description the answer for peer2.
    const answer=await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // send back the SDP to peer A.
    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})},MemberId);

}

// peerA adds the answer set by the peer B .
let addAnswer=async(answer)=>{
    // set remote desc of the peer A.
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer);
    }
}
init();