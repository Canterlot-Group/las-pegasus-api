import WebSocket from 'ws';
import escape from 'escape-html';
'use strict';

class Socket {

    constructor(models) {

        this._models = models;
        this.wss = new WebSocket.Server({ noServer: true });
        this.users = [];
        this.channels = [];

        this.wss.on('connection', (sockconn, req) => {

            var user = {
                conn: sockconn,
                ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress, // reverse proxy via Nginx/Apache
                ip_direct: req.connection.remoteAddress, // ip of nginx/apache if reverse proxy is used, otherwise user
                authenticated: false,
                id: null, name: null,
                session_id: null,
                channels: ['#global'], // public channels
                pm: [], // private messaging (array of objects with ids and names of users)
                last_msg: (new Date()).getTime()
            }

            this.users.push(user);

            sockconn.on('message', msg => {
                let time_now = (new Date()).getTime();
                if (user.last_msg + 600 >= time_now)
                    return sockconn.send(JSON.stringify({ category: 'general', stat: 'Err', error: 'ratelimit reached' }));
                else
                    user.last_msg = time_now;

                try {
                    var message = JSON.parse(msg);
                } catch (e) {
                    return sockconn.send(JSON.stringify({ category: 'general', stat: 'Err', error: 'json not understood' }));
                }

                if (message.category == 'chat') {

                    if (message.type == 'to-channel' && message.channel && message.contents)
                        this.sendToChannel(user, message.channel.toString().toLowerCase(), escape(message.contents));

                    else if (message.type == 'join-channel' && message.channel) {
                        let res = this.joinChannel(user, message.channel);
                        if (res) {
                            sockconn.send(JSON.stringify({ category: 'join-channel', channel: message.channel, stat: 'OK' }));
                            this.sendToChannel({id: null, name: 'Notification'}, message.channel, `+ ${user.name}`);
                        }
                    }

                }

                else if (message.category == 'general') {

                    if (message.type = 'authenticate' && message.apiSession) {
                        this.authenticate(message.apiSession, user).then(response => {
                            if (response.ok) {
                                user.name = response.user_name;
                                user.id   = response.user_id;
                                user.session_id = message.apiSession;
                                user.authenticated = true;
                                var to_res = {category: 'general', type: 'authentication', stat: 'OK'};
                            } else {
                                var to_res = {category: 'general', type: 'authentication', stat: 'Err', reason: response.reason};
                            }
                            sockconn.send(JSON.stringify(to_res));
                        })
                    }

                }
            });

        });

    }

    async archive(author, channel, contents) {
        this._models.ChatLog.create({destination: `${channel}`, content: `${contents}`, UserId: author.id}).then()
            .catch(e => console.error(`Cannot archive message by "${author.name}":\r\n${contents}`.red.bold));
    }

    async authenticate(session_id, user) {

        if (user.authenticated)
            return {ok: false, reason: 'already authenticated'};

        let ses = await this._models.Session.findOne(
            { where: { sessionId: session_id, ipAddress: user.ip },
            include: { model: this._models.User, attributes: ['name'] } });
        if (!ses) return {ok: false, reason: 'denied'};

        return {ok: true, user_name: ses.User.name, user_id: ses.User.id};
        
    }

    leaveChannel(user, channel_name) {
        var channel = this.channels[this.channels.find(ch => ch.name = channel_name)];
        if (channel === undefined)
            return {error: 'channel not registered'};

        this.channels.splice(this.channels.indexOf({ id: user.id, session: user.session_id }), -1);
        return true;
    }

    joinChannel(user, channel_name) {
        if (user.authenticated) {
            var channel = this.channels[this.channels.find(ch => ch.name = channel_name)];
            if (channel === undefined)
                return {error: 'channel not registered'};

            if (channel.clients.includes({ id: user.id, session: user.session_id }))
                return {error: 'client already active'};

            channel.clients.push({ id: user.id, session: user.session_id });
            return true;
        } else {
            return {error: 'client not authenticated'};
        }
    }

    sendToChannel(author, channel, contents) {
        this.users.filter( (curr) => curr.channels.includes(channel) )
            .forEach(user => user.conn.send(JSON.stringify(
                {category: 'chat', type: 'message', channel: channel, author: { id: author.id, name: author.name }, contents: contents })));
        this.archive(author, channel, contents);
    }

    broadcastToClients(contents) {
        this.users.forEach(user => user.conn.send(JSON.stringify({ cat: 'chat', type: 'broadcast', contents: contents })));
    }

}

export default Socket;
