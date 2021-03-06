// import AgoraRTM from '../agora-rtm-sdk-1.4.4';
const camera=document.getElementById("cameraBtn");
const mic=document.getElementById("micBtn");

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

// redirect back to the login page.
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

const contraints={
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1920, max:1920}
    },
    audio:true
};
const init=async()=>{
    // create and return an RTM  client instance.
    client=await AgoraRTM.createInstance(APP_ID,{enableLogUpload:true});
    
    // login auth
    await client.login({uid,token});

    // room id(channel) e.g index.html?room=1243432
    channel=client.createChannel(roomId);
    
    // join the channel.
    await channel.join();

    // event listener that other member joins.
    channel.on("MemberJoined", handleuserJoined);

    // event listener on membeLeft event.
    channel.on("MemberLeft", handleuserLeft);

    // message from peer. Respond tothe message
    client.on("MessageFromPeer", handleMessageFromPeer);

    localStream= await navigator.mediaDevices.getUserMedia(contraints);
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

    // both peers will send out candidates. add ICEcandidate to peer connection.
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
    document.getElementById("peer-B").style.display="block";

    document.getElementById("peer-A").classList.add("smallFrame");
    
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

// handle user left event.
let handleuserLeft=async(MemberId)=>{
    document.getElementById('peer-B').style.display="none";
    document.getElementById("peer-A").classList.remove("smallFrame");
}

// leave channel logout and leave.
let leaveChannel=async()=>{
    await channel.leave();
    await channel.logout();
};

// camera toggle event.
let toggleCamera=async()=>{
    const videoTrack=localStream.getTracks().find(track=>track.kind==="video");
    if(videoTrack.enabled){
        videoTrack.enabled=false;
       camera.style.backgroundColor="rgb(255,80,80)";
    }else{
        videoTrack.enabled=true;
        camera.style.backgroundColor="rgb(179,102,249,1)";
    }
}

// toggle mic event.
let toggleMic=async()=>{
    const audioTrack=localStream.getTracks().find(track=>track.kind==='audio');
    if(audioTrack.enabled){
        audioTrack.enabled=false;
        mic.style.backgroundColor="rgb(255,80,80)";
        console.log("Muted")
    }else{
        audioTrack.enabled=true;
        mic.style.backgroundColor="rgb(179,102,249,1)";
        console.log("live");
    }
}
window.addEventListener("beforeunload", leaveChannel);
camera.addEventListener("click", toggleCamera);
mic.addEventListener("click",toggleMic);
init();