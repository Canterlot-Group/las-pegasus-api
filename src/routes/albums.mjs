'use strict';

export default (RouteInterface => {


    return class Album extends RouteInterface {

        // GET /album/:album_id
        getOne(req, res) {
            return this._models.Album.findByPk(req.params.album_id, {
                include: [this._models.Song, {model: this._models.Artist, attributes: {exclude: ['UserId']}}]
                }).then(album => res.json({ stat: 'OK', album: album }))
                .catch(err => this._handleErrors(err));
        }

        // GET /albums
        getAll(req, res) {
            return this._models.Album.findAndCountAll(this._paginate(req, {
                include: [this._models.Song, this._models.Artist]
            })).then(album => res.json({ stat: 'OK', album: album }));
        }

        // POST /album
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            req.body.id = null;
            this._models.Album.create(req.body)
            .then(album => {

                album.setSongs(req.body.songs || []).then(() => {
                    album.setArtists(req.body.artists).then(() => {
                        res.json({ stat: 'OK', id: album.id });
                    }).catch(err => this._handleErrors({req, res}, err));
                }).catch(err => this._handleErrors({req, res}, err));
                
            }).catch(err => this._handleErrors({req, res}, err));
        }

        // DELETE /album/:album_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            this._models.Album.destroy({ where: { id: req.params.album_id } })
                .then(() => res.json({ stat: 'OK' })).catch(err => this._handleErrors({req, res}, err));
        }

    }


});
