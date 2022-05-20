// import adapter from '../node_modules/webrtc-adapter';

let APP_ID="4f13e7ff05ee403b907da0f50bf50bb1";

// authentication.
// token created from a web app. Deploy your own for production servers
let token="0064f13e7ff05ee403b907da0f50bf50bb1IAA67WUvSHUxI6VyZ62EAw7EZC/aJIalzaloROcK14nfhAx+f9gAAAAAEADO2X0GBgaJYgEA6AMGBoli";

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

    localStream= await navigator.mediaDevices.getUserMedia({video:true, audio:true});
    document.getElementById("peer-A").srcObject=localStream;
    createOffer();
}


const handleuserJoined=async(MemberId)=>{
    console.log(" A new user joined the channel", MemberId);
}
// create ICE candidates.

const createOffer=async()=>{
    peerConnection=new RTCPeerConnection(servers);

    // create a mediaStream object
    remoteStream=new MediaStream();

    document.getElementById("peer-B").srcObject=remoteStream;
    // add media traks to the SDP metadata.
    localStream.getTracks().forEach((track)=>{
        peerConnection.addTrack(track, localStream);
    })
    // listen for when our peer adds their tracks too.
    peerConnection.ontrack=(e)=>{
        e.streams[0].getTracks().forEach((track)=>{
            remoteStream.addTrack(track);
        })
    }

    // create ICE candidates when setLocalDescription is set.
    peerConnection.onicecandidate=async(e)=>{
        if(e.candidate){
            console.log("New ICE candidate ",e.candidate );
        }
    }

    // create an SDP offer
    const offer=await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    console.log("Offer: ", offer);

}
init();