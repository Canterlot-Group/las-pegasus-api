import WebSocket from 'ws';
import escape from 'escape-html';
import { v4 as uuidv4 } from 'uuid';
'use strict';

class Socket {

    constructor(models, streams, ws_port) {

        this._models = models;
        this.wss = new WebSocket.Server({ port: ws_port });
        this.active_clients = {};
        this.channels = {};

        for (let i = 0; i < streams.length; i++)
            if (!streams[i].is_mirror)
                this.channels[streams[i].name] = {'stream_id': streams[i].id, 'clients': {}};

        this.wss.on('connection', (...args) => this.handleConnection(...args));
        console.log(`Chat initialized with channels: ${Object.keys(this.channels).join(", ")}`.green.bold);

    }

    _sendTo(client_id, message) {
        this.active_clients[client_id].connection.send(JSON.stringify(message));
    }

    _clientsOf(channel) {
        return Object.keys(this.channels[channel].clients);
    }

    async _saveToLog(client_id, channel, content) {
        var user = this.active_clients[client_id].user;
        this._models.ChatLog.create({destination: channel, content: escape(content), UserId: user.id}).then()
            .catch(e => console.error(`Cannot archive message by "${user.name}":\r\n${contents}`.red.bold));
    }

    handleConnection(sockconn, req) {

        var client_id = uuidv4();
        var incoming_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        sockconn.send(JSON.stringify({ stat: 'OK', client_id: client_id }));

        this.active_clients[client_id] = {
            ip: incoming_ip,
            connection: sockconn,
            user: {authenticated: false,
                name: null, id: null, session: null},
            channel: null, pms: [],
            last_message: (new Date()).getTime()
        }

        sockconn.on('message', message => this.commandHandler(message, client_id));

    }

    commandHandler(message, client_id) {

        try { var msgobj = JSON.parse(message); }
        catch (e) { return this._sendTo(client_id, {stat: 'Err', error: 'json not parseable'}); }
        
        let time_now = (new Date()).getTime();
        let last_call = this.active_clients[client_id].last_message;
        this.active_clients[client_id].last_message = time_now;

        if (last_call + 750 >= time_now)
            return this._sendTo(client_id, {stat: 'Err', error: 'too fast (ratelimit)'});


        switch (`${msgobj.type}`.toLowerCase()) {
           
            case 'auth':
                let session = msgobj.session;
                if (!session) return this._sendTo(client_id, {stat: 'Err', error: 'session missing'});
                return this.auth(client_id, msgobj.session,
                    res => res ? null : this._sendTo(client_id, {stat: 'Err', error: 'session invalid'}))

            case 'switch-channel':
                let channel = msgobj.channel;
                if (!channel) return this._sendTo(client_id, {stat: 'Err', error: 'channel missing'});
                return this.useChannel(client_id, channel,
                    res => res ? null : this._sendTo(client_id, {stat: 'Err', error: 'channel not exist'}));

            case 'send-message-to-channel':
                if (!msgobj.content) return this._sendTo(client_id, {stat: 'Err', error: 'content missing'});
                return this.messageToActiveChannel(client_id, msgobj.content,
                    res => res ? null : this._sendTo(client_id, {stat: 'Err', error: 'cannot send message'}));

            case 'send-message-to-client':
                if (!msgobj.content || !msgobj.destination_id) return this._sendTo(client_id, {stat: 'Err', error: 'content or destination missing'});
                return this.messageToClient(client_id, msgobj.destination_id, msgobj.content,
                    res => res ? null : this._sendTo(client_id, {stat: 'Err', error: 'cannot send message'}));

            case 'ping':
                return this._sendTo(client_id, {'stat': 'Pong'});

            default:
                this._sendTo(client_id, {stat: 'Err', error: 'unknown request'});

        }

    }


    async auth(client_id, session_id, callback) {

        var is_authenticated = this.active_clients[client_id].user.authenticated;
        var ip_address = this.active_clients[client_id].ip;

        if (!is_authenticated) {
            let session = await this._models.Session.findOne({
                where: {sessionId: session_id, ipAddress: ip_address },
                include: {model: this._models.User, attributes: ['name']}});

            if (!session)
                callback(false);

            let user_id = session.UserId;
            let user_name = session.User.name;

            this.active_clients[client_id].user = {
                authenticated: true, id: user_id,
                name: user_name, session: session_id
            }

            return callback(true);
        }
        else return callback(true);

    }

    async useChannel(client_id, channel, callback) {

        if (this.channels[channel] === undefined) return callback(false);

        let prev_channel = this.active_clients[client_id].channel;
        if (prev_channel !== null)
            delete this.channels[prev_channel].clients[client_id];

        this.channels[channel].clients[client_id] = {
            name: this.active_clients[client_id].user.name, canSpeak: this.active_clients[client_id].user.authenticated};

        this.active_clients[client_id].channel = channel;

        this._clientsOf(channel).forEach(c => {
            this._sendTo(c, {dataUpdate: {
                activeChannel: this.active_clients[client_id].channel,
                activeChannelClients: this.channels[channel].clients}});
        });

        callback(true);

    }

    async messageToActiveChannel(client_id, content, callback) {

        if (!this.active_clients[client_id].user.authenticated ||
            this.active_clients[client_id].channel === null) return callback(false);

        this._clientsOf(this.active_clients[client_id].channel).forEach(c => {

            this._sendTo(c, {newMessage: {activeChannel: this.active_clients[client_id].channel,
                author: client_id, content: escape(content)}});

            this._saveToLog(client_id, this.active_clients[client_id].channel, content);

        });

        callback(true);

    }

    async messageToClient(client_id, destination_id, content, callback) {

        if (!this.active_clients[client_id].user.authenticated ||
            this.active_clients[destination_id].user === undefined ||
            !this.active_clients[destination_id].user.authenticated)
            return callback(false);

        let client_name = this.active_clients[client_id].user.name;

        this._sendTo(destination_id, {
            newPrivateMessage: {from: {id: client_id, name: client_name}, content: escape(content)}});

        callback(true);

    }

}

export default Socket;
