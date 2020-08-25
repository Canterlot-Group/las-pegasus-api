'use strict';

export default (RouteInterface => {

    return class Artist extends RouteInterface {

        // GET /artist/:artist_id
        getOne(req, res) {
            if (!this._hasRank({req, res}, 'anonymous'))
                return this._denyPermission({req, res});

            var artist_id = req.params.artist_id;

            this._models.Artist.findByPk(artist_id, {
            }).then(async artist => {

                var is_same_user = (res.locals.user_id != null && res.locals.user_id === artist.UserId);
                var albums = await artist.getAlbums({ limit: 4, order: this._seq.random(), attributes: ['id', 'name'] });
                var user = null;

                var can_view_user = is_same_user || (res.locals.rank >= this._RANK['redactor']);

                if (can_view_user)
                    user = await artist.getUser();

                res.json({ stat: 'OK', artist: artist, user: can_view_user ? user : null,
                random_albums: albums, same_user: is_same_user });

            });

        }

        // GET /artists
        getAll(req, res) {
            if (!this._hasRank({req, res}, 'anonymous'))
                return this._denyPermission({req, res});

            var can_view_user = (res.locals.rank >= this._RANK['redactor']);
            this._models.Artist.findAll(this._paginate(req, {
                include: can_view_user ? {model: this._models.User} : undefined,
                attributes: {exclude: ['UserId']}
            })).then(artists => res.json({ stat: 'OK', artists: artists }));
        }

        // POST /artist
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            req.body.id = null;
            this._models.Artist.create(req.body).then(artist => {
                res.json({ stat: 'OK', artist_id: artist.id });
            }).catch(err => this._handleErrors({req, res}, err));
        }

        // PUT /artist/:artist_id
        edit(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'user'))
                return this._denyPermission({req, res});

            var artist_id = req.params.artist_id;

            delete req.body.id;
            if (res.locals.rank < this._RANK['admin'])
                delete req.body.UserId;

            this._models.Artist.findByPk(artist_id).then(async artist => {
                if (!artist) return res.status(404).json({ stat: 'Err', error: 'artist not found' });

                var user_can_edit = (artist.UserId !== null && artist.UserId === res.locals.user_id);

                if (user_can_edit || res.locals.rank < this._RANK['admin'])
                    artist.update(req.body).then(() => res.json({ stat: 'OK' })).catch(err => this._handleErrors({req, res}, err));
                else
                    this._denyPermission({req, res});
            });

        }

        // DELETE /artist/:artist_id
        delete(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            var artist_id = req.params.artist_id;
            this._models.Artist.destroy({where: { id: artist_id }}).then(() => {
                res.json({ stat: 'OK' });
            });
        }

    }
    
});
