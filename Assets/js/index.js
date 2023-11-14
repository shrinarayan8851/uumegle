
let localStream;
let username;
let remoteUser;
let url = new URL(window.location.href);

username = url.searchParams.get("username");
alert(username);
remoteUser = url.searchParams.get("remoteuser");
alert(remoteUser);
let peerConnection;
let remoteStream;
let sendChannel;
let receiveChannel;
var msgInput = document.querySelector("#msg-input");
var msgSendBtn = document.querySelector(".msg-send-button");
var chatTextArea = document.querySelector(".chat-text-area");





let init = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });


    document.getElementById("user-1").srcObject = localStream;
    createOffer();
};
init();


let socket = io.connect();

socket.on("connect", () => {

    if (socket.connected) {
        socket.emit("userconnect", {
            displayName: username,
        });
    }
});


let servers = {
    iceServers: [
        {
            urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"]
        },
    ],
};






let createPeerConnection = async () => {

    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    document.getElementById("user-2").srcObject = remoteStream; // set here remotestream for getting remote screen

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = async (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
    };

    remoteStream.oninactive = () => {
        remoteStream.getTracks().forEach((track) => {
            track.enabled = !track.enabled;
        });
        peerConnection.close();
    };

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            socket.emit("candidateSentToUser", {
                username: username,
                remoteUser: remoteUser,
                iceCandidateData: event.candidate,
            });
        }
    };


    sendChannel = peerConnection.createDataChannel("sendDataChannel");

    sendChannel.onopen = () => {
        console.log("Data channel is open and ready to use");

        onSendChannelStateChange();
    };


    peerConnection.ondatachannel = receiveChannelCallBack;

};

function SendData() {
    const msgData = msgInput.value;
    chatTextArea.innerHTML += "<div style='margin-top: 2px; margin-bottom: 2px;'><b>Me: </b>" + msgData + "</div>";
    msgInput.value = ''; // Clear the input field after sending the message
    chatTextArea.scrollTop = chatTextArea.scrollHeight; // Auto-scroll to the bottom

    if (sendChannel.readyState === "open") {
        sendChannel.send(msgData);
    }
}


function receiveChannelCallBack(event) {
    console.log("receive channel Callback");
    receiveChannel = event.channel;
    receiveChannel.onmessage = onReceiveChannelMessageCallBack;
    receiveChannel.onopen = onReceiveChannelStateChannel;
    receiveChannel.onclose = onReceiveChannelStateChannel;
}
function onSendChannelStateChange() {
    const readyState = sendChannel.readyState;
    console.log("Send channel state is:" + readyState);

    if (readyState == "open") {
        console.log("Data channel ready state is open - onSendChannelStateChange ");
    }
    else {
        console.log("Data channel ready state is not open - onSendChannelStateChange ");
    }
}



function onReceiveChannelMessageCallBack(event) {
    chatTextArea.innerHTML += "<div style='margin-top: 2px; margin-bottom: 2px;'><b>Stranger: </b>" + event.data + "</div>";
    chatTextArea.scrollTop = chatTextArea.scrollHeight; // Auto-scroll to the bottom
}
function onReceiveChannelStateChannel(event) {
    const readyState = receiveChannel.readyState;
    console.log("Receive channel state is:" + readyState);

    if (readyState == "open") {
        console.log("Data channel ready state is open - onReceiveChannelStateChange ");
    }
    else {
        console.log("Data channel ready state is not open - onReceiveChannelStateChange ");
    }
}

let createOffer = async () => {

    createPeerConnection();
    let offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);
    socket.emit("offerSendToRemote", {
        username: username,
        remoteUser: remoteUser,
        offer: peerConnection.localDescription,
    });
};


let createAnswer = async (data) => {
    remoteUser = data.username;
    createPeerConnection();
    await peerConnection.setRemoteDescription(data.offer);
    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answerSentToUser1", {
        answer: answer,
        sender: data.remoteUser,
        receiver: data.username,
    });

};

socket.on("ReceiveOffer", function (data) {
    createAnswer(data);
});


let addAnswer = async (data) => {
    if (!peerConnection.currentRemoteDiscription) {
        peerConnection.setRemoteDescription(data.answer);
    }
};

socket.on("ReceiveAnswer", function (data) {
    addAnswer(data);
});


socket.on("candidateReceiver", function (data) {
    peerConnection.addIceCandidate(data.iceCandidateData);
});

msgInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent the default action of the Enter key
        SendData();
    }
});

msgSendBtn.addEventListener("click", function (event) {
    SendData();
});








