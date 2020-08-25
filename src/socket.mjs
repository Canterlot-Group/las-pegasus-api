import io from 'socket.io';
'use strict';

class Socket {

    /*
     *
     *  I've set up some kind of WebSocket server that gets some data
     *  with the type of "verify", then it responds with "no" with the type of "pop"
     *  which client (socket.html) prints out in console.
     * 
     *  This file is responsible for both chat and instantly getting the song/stream
     *  information, etc.
     * 
     *  verifyConnection should check if the Session provided through the socket channel
     *  is valid, and if so then let the user send messages to chat.
     * 
     *  if user is unauthenticated it can only receive song information and what's going on
     *  in chat.
     * 
     */ 

    constructor(app, models) {

        this._io = io(app);
        this._models = models;

        var that = this;
        this._io.on('connection', sock => {

            console.log('o');

            sock.verified = false;
            sock.userId   = null;

            sock.on('verify', msg => this.verifyConnection(msg, sock));
        });

    }

    verifyConnection(msg, sock) {

        var [sessionId, userId] = msg.split(':');
        if ([sessionId, userId].includes(undefined)) {
            console.dir(msg);
            sock.emit('pop', 'no');
            sock.disconnect();
        }

    }



}

export default Socket;
