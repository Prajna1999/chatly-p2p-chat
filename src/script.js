// import adapter from '../node_modules/webrtc-adapter';
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
    localStream= await navigator.mediaDevices.getUserMedia({video:true, audio:true});
    document.getElementById("peer-A").srcObject=localStream;
    createOffer();
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