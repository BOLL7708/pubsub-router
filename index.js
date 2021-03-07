const pubsub = require('./modules/pubsub.js');
const auth = require('./modules/auth.js');

startRouter();

function startRouter() {
    auth.getToken()
        .then(token => {
            pubsub.init(token);
        })
        .catch(err => {
            console.error(err);
        });
}