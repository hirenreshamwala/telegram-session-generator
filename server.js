const express = require('express');
const expressApp = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const port = 3377;

const gramjsOptions = {
    requestRetries: 5,
    connectionRetries: 5,
    downloadRetries: 5,
    retryDelay: 1000,
    autoReconnect: true,
    floodSleepThreshold: 60,
    useWSS: false,
};

function callbackPromise() {
    // helper method for promises
    let resolve, reject;
  
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
  
    return { promise, resolve, reject };
}

class TelegramSessionGenerator {
    constructor(apiId, apiHash, mobileNumber){
        this.apiId = apiId;
        this.apiHash = apiHash;
        this.mobileNumber = mobileNumber;
        this.codeCallback = callbackPromise();

        this.client = new TelegramClient(
            new StringSession(''),
            this.apiId,
            this.apiHash,
            gramjsOptions
        );
        // this.client.connect().then(() => {}).catch(() => {});
    }
    async getCode(){
        await this.client.connect();
        const result = await this.client.sendCode(
            {
            apiId: this.apiId,
            apiHash: this.apiHash,
            },
            this.mobileNumber
        );
        console.log(result);
        this.phoneCodeHash = result.phoneCodeHash;
    }

    async validateAuthCode(code){
        await this.client.invoke(
            new Api.auth.SignIn({
                phoneNumber: this.mobileNumber,
                phoneCodeHash: this.phoneCodeHash,
                phoneCode: code,
            })
        );
        this.session = this.client.session.save();
        console.log(this.apiId, this.session);
        await this.client.sendMessage("me", { message: `Your Session is: ${this.session}` });
    }
}

const sessionRequests = [];
expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.use(bodyParser.json());
expressApp.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
expressApp.use(session({ 		//Usuage
    secret: 'v2fDKSpEexkjnBYS9rcmhOW',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}));
expressApp.use(express.static(__dirname + '/telegram-app/dist'));
const server = require('http').createServer(expressApp);

/* SETUP HTTPS */
// const server = require('https').createServer({
//     key: fs.readFileSync('/etc/letsencrypt/live/domain.com/privkey.pem'),
//     cert: fs.readFileSync('/etc/letsencrypt/live/domain.com/cert.pem'),
//     ca: fs.readFileSync('/etc/letsencrypt/live/domain.com/chain.pem'),
// });

server.listen(port);
server.on('listening', () => {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.log('Listening on ' + bind);
});

expressApp.get('', (req, res) => {
    res.sendFile(path.join(__dirname+'/telegram-app/dist/index.html'));
});
expressApp.get('/generate-session', (req, res) => {
    res.sendFile(path.join(__dirname+'/telegram-app/dist/index.html'));
});
expressApp.post('/generate-session', async (req, res) => {
    let {api_id, api_hash, phone_number} = req.body;
    if(!api_id || !api_hash || !phone_number){
        res.send({
            status: 'error',
            error: 'Please enter all parameters'
        });return;
    }

    api_id = Number(api_id);
    api_hash = String(api_hash);

    try {
        let s = sessionRequests.find(e => e.apiId === api_id);
        if(!s){
            s = new TelegramSessionGenerator(api_id, api_hash, phone_number);
        }
        s.apiHash = api_hash;
        s.mobileNumber = phone_number;
        sessionRequests.push(s);
        await s.getCode();
        res.send({
            status: 'success',
            message: 'Code sent'
        });return;
    } catch (err){
        const { errorMessage } = err;
        let message = 'Something went wrong! Please try again later.';
        if(errorMessage === 'PHONE_NUMBER_INVALID'){
            message = 'Invalid phone number';
        }
        res.send({
            status: 'error',
            error: message
        });
    }
});

expressApp.post('/validate-otp', async (req, res) => {
    let {api_id, otp} = req.body;
    api_id = Number(api_id);
    let s = sessionRequests.find(e => e.apiId === api_id);
    if(!s){
        res.send({
            status: 'error',
            error: 'Please restart the process'
        });return;
    }

    try {
        await s.validateAuthCode(otp);
        res.send({
            status: 'success',
            message: 'Code generated successfully',
            session: s.session
        });
    } catch (err) {
        const { errorMessage } = err;
        console.log(errorMessage || err.message);
        let message = 'Something went wrong! Please try again later.';
        if(errorMessage === 'PHONE_CODE_INVALID'){
            message = 'Invalid OTP';
        } else if(errorMessage){
            message = errorMessage;
        }
        res.send({
            status: 'error',
            error: message
        });
    }
    
});