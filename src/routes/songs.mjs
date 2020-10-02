'use strict';
export default (RouteInterface => {

    return class Song extends RouteInterface {

        constructor(seq, models, ops, storage) {
            super(seq, models, ops);
            this._stor = storage;
        }

        // GET /song/:song_id
        getOne(req, res) {
            var song_id = req.params.song_id;
            this._models.Song.findByPk(song_id, {
                include: [
                    { model: this._models.Artist, attributes: { exclude: ['UserId'] } },
                    { model: this._models.Stream },
                    { model: this._models.Album },
                    { model: this._models.Comment, attributes: { exclude: ['UserId', 'SongId'] },
                        include: { model: this._models.User, attributes: ['id', 'name'] }
                    }
            ]}).then(async song => {

                if (!song)
                    return res.json({ stat: 'Err', err: 'song not exist' });

                const user_id = res.locals.user_id;

                const fav_count_all = await this._models.Favourite.count({ where: {SongId: song.id} });
                const fav_count_per_user = user_id ? await this._models.Favourite.count({ where: {SongId: song.id, UserId: user_id} }) : 0;

                const coverArt = this._stor.get(`song-${song.id}`, 'arts') || this._stor.get(`album-${song.AlbumId !== null ? song.AlbumId : 'default'}`, 'arts');

                res.json({ stat: 'OK', song: song, coverArt: coverArt, favouriteCount: fav_count_all, userLiked: !!fav_count_per_user });

            }).catch(err => this._handleErrors({req, res}, err));
        }

        // GET /song/random (?limit=6)
        getRandom(req, res) {
            var default_limit = 6, max_limit = 12;
            var song_limit = parseInt(req.query.limit) || default_limit;

            if (song_limit > max_limit)
                song_limit = default_limit;

            this._models.Song.findAll({
                where: { public: true },
                limit: song_limit, order: this._seq.random(),
                include: [
                    {model: this._models.Album},
                    {model: this._models.Artist, attributes: {exclude: ['UserId']}, through: {attributes: []}},
                    {model: this._models.Stream, attributes: ['id', 'name'], through: {attributes: []}}
                ]
            }).then(songs => res.json({ stat: 'OK', songs: songs }));
        }

        // GET /songs
        getAll(req, res) {
            this._models.Song.findAndCountAll(this._paginate(req, {
                where: { public: true },
                include: [
                    {model: this._models.Album},
                    {model: this._models.Artist, attributes: {exclude: ['UserId']}, through: {attributes: []}},
                    {model: this._models.Stream, attributes: ['id', 'name'], through: {attributes: []}}
                ]
            })).then(songs => res.json({ stat: 'OK', songs: songs }));
        }

        // POST /song
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            delete req.body.id;
            if (!req.body.songEncoded)
                return res.json({ stat: 'err', error: 'missing file' })


            this._models.Song.create(req.body).then(song => {
            
                song.setArtists(req.body.artists || []).then(() => {
                    song.setStreams(req.body.streams || []).then(() => {

                        this._stor.save(`${song.id}`, 'songs', req.body.songEncoded).then(save_result => {

                            if (req.body.songCoverEncoded)
                                this._stor.save(`song-${song.id}`, 'arts', req.body.songCoverEncoded).then(cover_save_result => {
                                    if (!cover_save_result) res.json({ stat: 'err', error: cover_save_result });
                                });

                            if (!res.headersSent)
                                if (save_result != 'ok') {
                                    song.destroy();
                                    console.error(`Error while saving file: ${save_result}`);
                                    res.json({ stat: 'err', error: save_result });
                                } else
                                    res.json({ stat: 'OK', song_id: song.id });

                        });

                    }).catch(err => this._handleErrors({req, res}, err));
                }).catch(err => this._handleErrors({req, res}, err));

            }).catch(err => this._handleErrors({req, res}, err));
        }

        // PUT /song/:song_id
        edit(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            var song_id = req.params.song_id;
            delete req.body.id;

            this._models.Song.findByPk(song_id).then(song => {

                if (!song)
                    return res.json({ stat: 'OK', error: 'song does not exist' });

                song.update(req.body).then(song => {
                
                    song.setArtists(req.body.artists || []).then(() => {
                        song.setStreams(req.body.streams || []).then(() => {

                            res.json({ stat: 'OK' });

                        }).catch(err => this._handleErrors({req, res}, err));
                    }).catch(err => this._handleErrors({req, res}, err));

                }).catch(err => this._handleErrors({req, res}, err));
            });
        }

        // DELETE /song/:song_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            var song_id = req.params.song_id;
            this._models.Song.destroy({where: { id: song_id }}).then(() => {
                this._stor.delete(song_id, 'songs');
                res.json({ stat: 'OK' });
            });
        }

    }
    
});
