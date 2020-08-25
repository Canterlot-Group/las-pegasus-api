import config from './config.mjs';
import fetch from 'node-fetch';
'use strict';

class Icecast {

    constructor() {
        this.data = {};
        this.streams = [];
        this.net_usage = 0;
        this.listeners = 0;

        this._updater();
        this.startUpdater();
    }

    _updater() {

        var ic = this;
        fetch(`${config.icecast_url}/status-json.xsl`)
            .then(res => res.json())
            .then(json => {
                ic.data = json.icestats;
                ic.streams = ic.data.source.length ? ic.data.source : [ic.data.source];
                
                let listeners = 0;
                for (let i = 0; i < ic.streams.length; i++)
                    listeners += ic.streams[i].listeners;
                    
                this.listeners = listeners;
            })
            .catch(err => console.error(err));

    }

    startUpdater() { this._updaterInterval = setInterval(this._updater, 7500); }
    stopUpdater() { clearInterval(this._updaterInterval); }

}

export default Icecast;
