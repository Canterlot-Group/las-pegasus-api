import fs from 'fs';
import sequelize from 'sequelize';
'use strict';

class Scheduler {

    constructor(models, stream_id, config) {
        this._models = models;
        this._config = config;
        this._id     = stream_id;
        this._fspath = config.file_storage_path + `shuffle${stream_id}.json`;
        this.queue   = [];
        this.current_episodes = [];
        this.songs_since_bumper = 0;
        this.active_playlists_songs = {};

        //setTimeout( async () => this.current_episodes = await this.checkForShow(this._models.Episode, this._models.Show, this._id), 100);
        //setInterval(async () => this.current_episodes = await this.checkForShow(this._models.Episode, this._models.Show, this._id), 120000);
        setTimeout(() => this.updateQueue(), 100);
        setInterval(() => this.updateQueue(), 1000);

    }

    nowPlaying() {

    }

    next() {

    }

    // no need for "async" since it returns Promise anyway
    getRelevantPlaylists() {

        return this._models.Playlist.findAll({ where: {StreamId: this._id, [sequelize.Op.or]: [
                sequelize.literal(`isnull(finishDate) and emissionDate > now() and emissionDate < date_add(now(), interval 10 minute)`),
                sequelize.literal(`emissionDate < now() and finishdate > now()`)
        ]}});

    }

    async updateQueue() {

        var playlists = await this.getRelevantPlaylists();
        playlists = playlists.concat(
            await this._models.Playlist.findAll({where: {id: Object.keys(this.active_playlists_songs)}}));
        playlists = playlists.filter((playlist, index, a) => a.findIndex(t => (t.id === t.id)) === index);

        var [min, max] = this._config.queue_size;
        if ( this.queue.length < min ) {

            let episodes = this.current_episodes;
            if (episodes[0] !== undefined) {
                
                var sorted_episodes = episodes.sort( (a, b) => (new Date(a.emissionDate)) - (new Date(b.emissionDate)) );

                let first_episode = sorted_episodes[0];
                var first_episode_unix = ((new Date(first_episode.emissionDate)).getTime() / 1000);

                var unix_timestamp_now = Math.floor((new Date()).getTime() / 1000);
                var predicted_songs = this.getFromShuffleFile();
                var predicted_time = unix_timestamp_now;

                var songs = await this._models.Song.findAll({ where: { id: { [sequelize.Op.or]: predicted_songs } }, attributes: ['id', 'length'] });

                for ( var i = 0; i < predicted_songs.length; i++ ) {
                    for ( var j = 0; j < songs.length; j++ ) {
                        if ( predicted_songs[i] == songs[j].id ) {

                            predicted_songs[i] = songs[j];
                            break;

                        }
                    }
                }

                songs = null;
                var sifted_songs = [];
                for ( var i = 0; i < predicted_songs.length; i++ ) {

                    predicted_time += predicted_songs[i].length;
                    sifted_songs.push(predicted_songs[i]);

                    if (predicted_time > first_episode_unix)
                        break;

                }

                var len_sum = sifted_songs.reduce( (a, b) => a + b.length, 0 );
                var len_sum_without_last = len_sum - sifted_songs[sifted_songs.length - 1].length;
                // sifted_songs.length = size of array, sifted_songs[x].length = "length" key in object

                console.log(`first: ${Math.abs(first_episode_unix - (unix_timestamp_now + len_sum))}`);
                console.log(`second: ${Math.abs(first_episode_unix - (unix_timestamp_now + len_sum_without_last))}`);

                if (Math.abs(first_episode_unix - (unix_timestamp_now + len_sum)) > Math.abs(first_episode_unix - (unix_timestamp_now + len_sum_without_last))) {
                    console.log(`printing all except last:`)
                    console.log(sifted_songs.slice(0, sifted_songs.length - 2));
                } else {
                    console.log(`printing all:`)
                    console.log(sifted_songs);
                }

            } else if (this.songs_since_bumper >= 5) { // no episodes

                let should_play = Math.ceil(Math.random() * (12 - this.songs_since_bumper) + this.songs_since_bumper);
                if ( should_play == 12 || this.songs_since_bumper >= 10 ) {

                    var bumper_to_play = await this.chooseBumper();

                    if (bumper_to_play !== null)
                        console.log(`playing bumper: ${bumper_to_play}`);

                    this.songs_since_bumper = -1;

                }

            } else if (playlists.length !== 0) {

                var active_playlist = [];
                var time_now = (new Date()).getTime();

                for (let playlist of playlists) {
                    // TODO: add time predicting later
                    if (playlist.emissionDate < time_now && (playlist.finishDate === null || playlist.finishDate > time_now))
                        active_playlist.push(playlist);
                }

                // if there are multiple playlist with highest priority, use one with lower ID (older, default MySQL behaviour)
                if (active_playlist.length !== 0)
                    var chosen_playlist = active_playlist.reduce((max, playlist) => playlist.priority > max.priority ? playlist : max);
                else
                    return; // TODO: Recurse to find something to play.

                var songs_ids = JSON.parse(chosen_playlist.songs);
                if (chosen_playlist.allowQueue)
                    console.log(`${chosen_playlist.name} allowed queueing.`); // TODO: add handler for user-defined queues

                if (songs_ids.length === 0) {
                    console.log(`${chosen_playlist.name} empty. Deploying default shuffle.`);
                    return;
                }

                if (!Object.keys(this.active_playlists_songs).includes(chosen_playlist.id))
                    this.active_playlists_songs[chosen_playlist.id] = songs_ids;

                var chosen_song;
                switch (chosen_playlist.sort) {

                    case 'ordered':
                        if (this.active_playlists_songs[chosen_playlist.id].length === 0)
                            delete this.active_playlists_songs[chosen_playlist.id];
                            // TODO: Recurse update queue to find something to play.
                        else
                            chosen_song = this.active_playlists_songs[chosen_playlist.id].shift();
                            console.log(`Playing ${chosen_song} for playlist ${chosen_playlist.name} (ordered)`);
                        break;

                    case 'randomByHours':
                        if (chosen_playlist.finishDate < time_now)
                            delete this.active_playlists_songs[chosen_playlist.id];
                            // TODO: Recurse update queue to find something to play.
                        else {
                            let random_index = Math.floor(Math.random() * this.active_playlists_songs[chosen_playlist.id].length);
                            chosen_song = this.active_playlists_songs[chosen_playlist.id][random_index];
                            console.log(`Playing ${chosen_song} for playlist ${chosen_playlist.name} (randomByHours)`);
                        }
                        break;

                    case 'shuffle':
                        if (this.active_playlists_songs[chosen_playlist.id].length === 0)
                            delete this.active_playlists_songs[chosen_playlist.id];
                            // TODO: Recurse update queue to find something to play.
                        else {
                            let random_index = Math.floor(Math.random() * this.active_playlists_songs[chosen_playlist.id].length);
                            chosen_song = this.active_playlists_songs[chosen_playlist.id].splice(random_index, 1);
                            console.log(`Playing ${chosen_song} for playlist ${chosen_playlist.name} (shuffle)`);
                        }
                        break;

                    default:
                        console.log(`${chosen_playlist.name} has invalid sort type. Deploying default shuffle.`);

                }

            } else {

                // TODO: Play some song
                console.log(`Playing random song in stream ${this._id}`);

            }

        }

        this.songs_since_bumper++;

    }


    getFromShuffleFile(count = 25) {
        return JSON.parse(fs.readFileSync(this._fspath)).slice(0, count);
    }


    async checkForShow(epModel, showModel, sid) {

        var wh = {
            [sequelize.Op.and]: [
                // emissionDate >= time now
                sequelize.where(sequelize.col('emissionDate'), '>=', sequelize.fn('now')),
                sequelize.where(
                    // emissionDate < tomorrow midnight
                    sequelize.fn('date', sequelize.col('emissionDate')), '<',  sequelize.fn('date_add', sequelize.fn('date', sequelize.fn('now')), sequelize.literal('interval "1 00:02" DAY_MINUTE'))
                )
            ]
        }

        var episodes = await epModel.findAll({ where: wh, include: { model: showModel, attributes: ['id'], where: { StreamId: sid } } });
        if (!episodes) return [];

        // find all emissionDate between time now and time now + 1 hour
        return episodes.filter( val => {
            var now = (new Date()).getTime();
            var hour_in_future = (now + 7200000);
            var emission_time = (new Date(val.emissionDate)).getTime();

            return ( now < emission_time && emission_time < hour_in_future );
        });

    }


    async chooseBumper() {

        var bumpers = await this._models.Bumper.findAll({ attributes: ['id', 'rarity'], where: [{ StreamId: this._id }, sequelize.literal(`(
            ((emissionDate < NOW() AND finishDate > NOW() )
                AND ((timeframeStart IS NULL)
                    OR ((TIME(NOW()) < timeframeEnd AND timeframeStart > timeframeEnd) OR (TIME(NOW()) > timeframeStart AND TIME(NOW()) < timeframeEnd))))
            OR ((emissionDate IS NULL)
                AND ((timeframeStart IS NULL)
                    OR ((TIME(NOW()) < timeframeEnd AND timeframeStart > timeframeEnd) OR (TIME(NOW()) > timeframeStart AND TIME(NOW()) < timeframeEnd)))))`)]});

        if (!bumpers.length) return null;

        if ( bumpers.some( e => e.rarity >= 1 ) ) {
            return bumpers.reduce( (prev, curr) => (prev.rarity > curr.rarity) ? prev : curr ).id;
        }

        let rarity_sum = bumpers.reduce( (accum, curr) => accum + curr.rarity, 0 );
        let rand_pointer = Math.random() * rarity_sum;

        var accum = 0;
        for (var i = 0; i < bumpers.length; i++) {
            if ((accum += bumpers[i].rarity) >= rand_pointer)
                return bumpers[i].id;
        }

    }


    regularShuffle() {

        let path = this._fspath;
        let sid = this._id;

        this._models.Song.findAll({ attributes: ['id'], include: [ {model: this._models.Stream, where: {id: sid}, attributes: []} ], where: { public: true }, order: [ sequelize.fn('rand') ] }).then(songs => {

            fs.writeFile(path, JSON.stringify(songs.map( x => x.id )), 'utf8', e => {
                if (e) return console.error(`Could not write to file at ${path}. Shuffle for stream ${sid} might be broken.`);
            });

        });

    }

}

export default Scheduler;
