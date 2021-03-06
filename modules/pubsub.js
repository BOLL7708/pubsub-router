const WebSocket = require("ws");

let _socket;
let _token;
let _reconnectInterval;
let _pingInterval;
let _pingTimestamp;

function init(token) {
    _token = token;
	console.log(`PubSub starting: ${token}`);
    startConnectLoop();
}

function startConnectLoop() {
    _reconnectInterval = setInterval(connect, 30*1000);
    connect();
}
function stopConnectLoop() {
    clearInterval(_reconnectInterval);
}

let connect = function() {
	_socket = new WebSocket("wss://pubsub-edge.twitch.tv");
	_socket.onopen = function (evt) { onOpen(evt) };
	_socket.onclose = function (evt) { onClose(evt) };
	_socket.onmessage = function (evt) { onMessage(evt) };
	_socket.onerror = function (evt) { onError(evt) };

	function onOpen(evt) {
        stopConnectLoop();
        console.log("PubSub connected");
		let payload = {
			type: "LISTEN",
			nonce: "7708",
			data: {
				topics: ["channel-points-channel-v1.21618260"], // ID should come from Helix user request (huh?)
				auth_token: _token
			}
		}
		_socket.send(JSON.stringify(payload));
        _pingInterval = setInterval(ping, 4*60*1000); // Ping at least every 5 minutes to keep the connection open
	}
	function onClose(evt) {
        clearInterval(_pingInterval);
		console.log("PubSub disconnected: starting loop");
        startConnectLoop();
	}
	function onMessage(evt) {
		let data = JSON.parse(evt.data);
        switch(data.type) {
            case "MESSAGE": 
                let payload = JSON.parse(unescape(data.data.message));
                if (payload.type == "reward-redeemed") {
                    console.log("Reward redeemed!");
                }
                break;
            case "RECONNECT": 
                _socket.close();
                break;
            case "PONG":
                if(new Date().now() - _pingTimestamp > 10000) _socket.close();
                break;
            case "RESPONSE":
                console.table(evt.data);
                break;
            default:
                console.log(`Unhandled message: ${data.type}`);
                break;
        }        
	}
	function onError(evt) {
		console.log("PubSub error: " + evt.data);
        _socket.close();
        startConnectLoop();
	}
}

let ping = function() {
    let payload = {
        type: "PING"
    }
    _socket.send(JSON.stringify(payload));
    _pingTimestamp = new Date().now();
}

module.exports = { init };