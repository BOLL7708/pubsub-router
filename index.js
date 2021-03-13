const auth = require('./modules/auth.js');
const config = require("./config.json");
const pubsub = require('./modules/pubsub.js');
const obs = require("./modules/obs.js");

startRouter();

function startRouter() {
    auth.getToken(config)
        .then(token => {
            pubsub.init(token);
            obs.init(config);
        })
        .catch(err => {
            console.error(`Auth.getToken error: ${JSON.stringify(err)}`);
        });
}