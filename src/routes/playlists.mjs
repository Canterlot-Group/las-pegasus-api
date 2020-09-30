'use strict';

export default (RouteInterface => {

    return class Playlist extends RouteInterface {

        // GET /playlist/:playlist_id
        getOne(req, res) {
            var playlist_id = req.params.playlist_id;
            this._models.Playlist.findByPk(
                playlist_id,
                {include: [
                    { model: this._models.Stream },
                    { model: this._models.User, attributes: ['id', 'name'] }
                ]}).then(playlist => res.json({ stat: 'OK', playlist: playlist }));
        }

        // GET /playlists
        getAll(req, res) {
            this._models.Playlist.findAndCountAll(this._paginate(req, {include: [
                {model: this._models.Stream},
                {model: this._models.User, attributes: ['id', 'name']}
            ]})).then(playlists => res.json({ stat: 'OK', playlists: playlists }));
        }

        // GET /playlists/by_date/:date
        getAllByDate(req, res) {
            var date_to_seek = req.params.date;
            this._models.Playlist.findAndCountAll({
                    where: {
                        [this._ops.and]: {
                            emissionDate: { [this._ops.lt]: date_to_seek },
                            finishDate:   { [this._ops.gt]: date_to_seek }
                        }
                    },
                    include: [
                        {model: this._models.Stream},
                        {model: this._models.User, attributes: ['id', 'name']}
                    ]
                }).then(playlists => res.json({ stat: 'OK', playlists: playlists }));
        }

        // POST /playlist
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'member'))
                return this._denyPermission({req, res});

            delete req.body.id;
            req.body.UserId = res.locals.user_id;

            this._models.Playlist.create(req.body).then(playlist => {
                res.json({ stat: 'OK', id: playlist.id });
            }).catch(e => this._handleErrors({req, res}, e));
        }

        // PUT /playlist/:playlist_id
        edit(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'member'))
                return this._denyPermission({req, res});

            delete req.body.id;
            req.body.UserId = res.locals.user_id;

            this._models.Playlist.update(req.body, {where: { id: req.params.playlist_id }})
            .then(() => res.json({ stat: 'OK' })).catch(err => this._handleErrors({req, res}, err));
        }

        // DELETE /playlist/:playlist_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            this._models.Playlist.destroy({where: { id: req.params.playlist_id }}).then(() => {
                res.json({ stat: 'OK' });
            });
        }

    }
    
});
