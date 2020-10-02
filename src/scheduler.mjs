import fs from 'fs';
import sequelize from 'sequelize';
'use strict';

class Scheduler {

    constructor(models, stream_id, file_storage_path) {
        this._models = models;
        this._id     = stream_id;
        this._fspath = file_storage_path + `shuffle${stream_id}.json`;
        this.regularShuffle();
        this.chooseBumper().then(res => console.log(stream_id + ' ' + res));
    }

    nowPlaying() {

    }

    next() {

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

        const rarity_sum = bumpers.reduce( (accum, curr) => accum + curr.rarity, 0 );
        const rand_pointer = Math.random() * rarity_sum;

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
