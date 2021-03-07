const WebSocket = require("ws");
const fs = require("fs");
const fetch = require("node-fetch");
const config = require("./config.json");

let _oauthInfo = {access_token: '', refresh_token: '', updated: ''};
let _pubsubWebsocket;
let _pubsubInterval;

startRouter();

function startRouter() {
    try {
        // Read local file
        _oauthInfo = JSON.parse(fs.readFileSync('./tokens.json', 'utf-8'));
        console.table(_oauthInfo);
        // Refresh by default
        getNewTokens().then(token => {
            // Start listener for PubSub
            let accessToken = (typeof token == 'undefined') ? _oauthInfo.access_token : token;
            listenToPubsub(accessToken);
        });
    } catch {
        // Create empty file if it did not read properly
        _oauthInfo.updated = getNow();
        fs.writeFile('./tokens.json', JSON.stringify(_oauthInfo), err => {
            if (err) console.log(err);
        });
    }
}


function listenToPubsub(token) {
	console.log(`Starting websockets with token: ${token}`);

	_pubsubWebsocket = new WebSocket("wss://pubsub-edge.twitch.tv");
	_pubsubWebsocket.onopen = function (evt) { onOpen(evt) };
	_pubsubWebsocket.onclose = function (evt) { onClose(evt) };
	_pubsubWebsocket.onmessage = function (evt) { onMessage(evt) };
	_pubsubWebsocket.onerror = function (evt) { onError(evt) };

	function onOpen(evt) {
		let payload = {
			type: "LISTEN",
			nonce: "7708",
			data: {
				topics: ["channel-points-channel-v1.21618260"], // ID should come from Helix user request
				auth_token: token
			}
		}
		_pubsubWebsocket.send(JSON.stringify(payload));
        _pubsubInterval = setInterval(pubsubPing, 4*60*1000);
	}
	function onClose(evt) {
        clearInterval(_pubsubInterval);
		console.log("Websockets disconnected.");
	}
	function onMessage(evt) {
        // TODO: Listen to RECONNECT here, when that happens set interval to reconnect.
		let data = JSON.parse(evt.data);
		if (data.type == "MESSAGE") {
			let payload = JSON.parse(unescape(data.data.message));
			if (payload.type == "reward-redeemed") {
				console.log("Reward redeemed!");
			}
		}
        console.table(evt.data);
	}
	function onError(evt) {
		console.log("Websockets error: " + evt.data);
        // TODO: Set interval to reconnect.
	}
}

let pubsubPing = function() {
    let payload = {
        type: "PING"
    }
    _pubsubWebsocket.send(JSON.stringify(payload));
}


async function getNewTokens () {
    return fetch('https://id.twitch.tv/oauth2/token', {
        method: 'post',
        body: new URLSearchParams({
            'grant_type': 'refresh_token',
            'refresh_token': _oauthInfo.refresh_token,
            'client_id': config.twitch.client_id,
            'client_secret': config.twitch.client_secret
        })
    }).then((response) => response.json()).then(json => {
        if (!json.error && !(json.status >= 300)) {
            _oauthInfo.access_token = json.access_token;
            _oauthInfo.refresh_token = json.refresh_token;
            _oauthInfo.updated = getNow();
            fs.writeFile('./tokens.json', JSON.stringify(_oauthInfo), err => {
                if (err) console.log(`Failed to save tokens: ${err}`);
            });
            console.log(`Successfully refreshed tokens: [${json.status}]`);
        } else {
            console.error(`Failed to refresh tokens: [${json.status}], ${json.error}`);
        }
        return json.access_token;
    });
}

function getNow() {
    let d = new Date();
    return `${d.getFullYear()}-${f(d.getMonth()+1)}-${f(d.getDate())} ${f(d.getHours())}:${f(d.getMinutes())}:${f(d.getSeconds())}`;
    function f(n) {
        return (n+"").padStart(2, '0');
    }
}