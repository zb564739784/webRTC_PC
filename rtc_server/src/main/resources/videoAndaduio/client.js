    var url = "http://192.168.1.111:8090/myapp";
    var name;
    var connectedUser;
    var ws;
    var PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var SessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
    var getUserMedia = navigator.getUserMedia ? "getUserMedia" :
        navigator.mozGetUserMedia ? "mozGetUserMedia" :
            navigator.webkitGetUserMedia ? "webkitGetUserMedia" : "getUserMedia";
    //websock连接

    //           ws= new WebSocket(url);//连接websocket
    ws = new SockJS(url);//连接websocket
    // 收到消息时的回调函数
    ws.onmessage = function (msg) {
        console.log("Got message", msg.data);
        var data = JSON.parse(msg.data);
        switch (data.type) {
            case "login":
                handleLogin(data.success);
                break;
            //when somebody wants to call us
            case "offer":
                handleOffer(data.offer, data.name);
                break;
            case "answer":
                handleAnswer(data.answer);
                break;
            //when a remote peer sends an ice candidate to us
            case "candidate":
                handleCandidate(data.candidate);
                break;
            case "leave":
                handleLeave();
                break;
            default:
                break;
        }
    };

    // 连接异常时的回调函数
    ws.onerror = function (e) {
        console.log('Web Socket 发生错误！');
    };

    // 连接关闭时的回调函数
    ws.onclose = function (e) {
        console.log('Web Socket 连接关闭！');
    };


    //         ws.onclose = connect;//断线重连
    //alias for sending JSON encoded messages
    function send(message) {
        //attach the other peer username to our messages
        if (connectedUser) {
            message.name = connectedUser;
        }
        ws.send(JSON.stringify(message));
    };
    //断开WebSocket连接
    function disconnect() {
        if (ws != null) {
            ws.close();
            ws = null;
        }
    }


    //******
    //UI selectors block
    //******

    var loginPage = document.querySelector('#loginPage');
    var usernameInput = document.querySelector('#usernameInput');
    var loginBtn = document.querySelector('#loginBtn');

    var callPage = document.querySelector('#callPage');
    var callToUsernameInput = document.querySelector('#callToUsernameInput');
    var callBtn = document.querySelector('#callBtn');

    var hangUpBtn = document.querySelector('#hangUpBtn');

    var localVideo = document.querySelector('#localVideo');
    var remoteVideo = document.querySelector('#remoteVideo');

    var yourConn;
    var stream;

    callPage.style.display = "none";

    // Login when the user clicks the button
    loginBtn.addEventListener("click", function (event) {
        name = usernameInput.value;
        if (name.length > 0) {
            send({
                type: "login",
                name: name
            });
        }
    });


    function handleLogin(success) {
        if (success === false) {
            alert("Ooops...try a different username");
        } else {
            loginPage.style.display = "none";
            callPage.style.display = "block";
            //**********************
            //Starting a peer connection
            //**********************
            //getting local video stream
            navigator.getUserMedia({video: true, audio: true}, function (myStream) {
                stream = myStream;
                //displaying local video stream on the page
                localVideo.src = window.URL.createObjectURL(stream);
                //using Google public stun server
                //需要stun和turn服务器安装或者公用
                // var configuration = {
                //	"iceServers": [{ "url": "stun:stun2.1.google.com:19302" }, {
                //   "url": "turn:numb.viagenie.ca",
                //    "username": "webrtc@live.com",
                //    "credential": "muazkh"
                //  }]
                // };
                var configuration = {
                    "iceServers": [{"url": "stun:stun2.1.google.com:19302"}]
                };
                yourConn = new PeerConnection(configuration);
                // setup stream listening
                yourConn.addStream(stream);
                //when a remote user adds stream to the peer connection, we display it
                yourConn.onaddstream = function (e) {
                    remoteVideo.src = window.URL.createObjectURL(e.stream);
                };
                // Setup ice handling
                yourConn.onicecandidate = function (event) {
                    console.log("onicecandidate==" + event.candidate);
                    if (event.candidate) {
                        send({
                            type: "candidate",
                            candidate: event.candidate
                        });
                    }
                };
            }, function (error) {
                console.log(error);
            });
        }
    };

    //initiating a call
    callBtn.addEventListener("click", function () {
        var callToUsername = callToUsernameInput.value;
        if (callToUsername.length > 0) {
            connectedUser = callToUsername;
            // create an offer
            yourConn.createOffer(function (offer) {
                console.log(offer);
                send({
                    type: "offer",
                    offer: offer,
                    connectedUser: connectedUser
                });
                yourConn.setLocalDescription(offer);
            }, function (error) {
                alert("Error when creating an offer");
            });
        }
    });

    //when somebody sends us an offer
    function handleOffer(offer, name) {
        console.log("message:offer--" + offer + "|||||||||||name" + name)
        connectedUser = name;
        yourConn.setRemoteDescription(new SessionDescription(offer));
        //create an answer to an offer
        yourConn.createAnswer(function (answer) {
            yourConn.setLocalDescription(answer);
            send({
                type: "answer",
                answer: answer,
                connectedUser: connectedUser
            });
        }, function (error) {
            alert("Error when creating an answer");
        });
    };

    //when we got an answer from a remote user
    function handleAnswer(answer) {
        yourConn.setRemoteDescription(new SessionDescription(answer));
    };

    //when we got an ice candidate from a remote user
    function handleCandidate(candidate) {
        yourConn.addIceCandidate(new RTCIceCandidate(candidate));
    };

    //hang up
    hangUpBtn.addEventListener("click", function () {
        send({
            type: "leave"
        });
        handleLeave();
    });

    function handleLeave() {
        connectedUser = null;
        remoteVideo.src = null;
        yourConn.close();
        yourConn.onicecandidate = null;
        yourConn.onaddstream = null;
    };