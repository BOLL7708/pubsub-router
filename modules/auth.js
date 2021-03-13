const fs = require("fs");
const fetch = require("node-fetch");
const utils = require("./utils.js");

let _oauthInfo = {access_token: '', refresh_token: '', updated: ''};
let _config;

async function getToken(config) {
    _config = config;
    try {
        // Read local file
        _oauthInfo = JSON.parse(fs.readFileSync('./tokens.json', 'utf-8'));
        console.table(_oauthInfo);
        
        // Refresh by default
        return refresh();
    } catch {
        // Create empty file if it did not read properly
        _oauthInfo.updated = utils.now();
        fs.writeFile('./tokens.json', JSON.stringify(_oauthInfo), err => {
            if (err) console.log(err);
        });

        // Throw to fail promise
        throw new Error("Unable to load token(s).");
    }
}
    
async function refresh () {
    return fetch('https://id.twitch.tv/oauth2/token', {
        method: 'post',
        body: new URLSearchParams({
            'grant_type': 'refresh_token',
            'refresh_token': _oauthInfo.refresh_token,
            'client_id': _config.twitch.client_id,
            'client_secret': _config.twitch.client_secret
        })
    }).then((response) => response.json()).then(json => {
        if (!json.error && !(json.status >= 300)) {
            _oauthInfo.access_token = json.access_token;
            _oauthInfo.refresh_token = json.refresh_token;
            _oauthInfo.updated = utils.now();
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

module.exports = { getToken }