'use strict';

export default (RouteInterface => {

    return class Stream extends RouteInterface {

        // GET /streams
        getAll(req, res) {
            this._models.Stream.findAll().then(
                streams => res.json({ stat: 'OK', streams: streams }));
        }

        // GET /stream/:stream_id
        getOne(req, res) {
            var stream_id = req.params.stream_id;
            this._models.Stream.findByPk(stream_id).then(stream => res.json({ stat: 'OK', stream: stream }));
        }

        // GET /stream/:stream_id/songs
        getSongs(req, res) {
            var stream_id = req.params.stream_id;
            this._models.Song.findAndCountAll(this._paginate(req, {
                include: [
                    {model: this._models.Album},
                    {model: this._models.Artist, attributes:{exclude: ['UserId']}},
                    {model: this._models.Stream, where: {id: stream_id}, attributes: []}
                ],
                where: { public: true }
            })).then(songs => res.json({ stat: 'OK', songs: songs }));
        }

        // POST /stream
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            req.body.id = null;
            this._models.Stream.create(req.body).then(stream => {
                res.json({ stat: 'OK', stream_id: stream.id });
            }).catch(err => this._handleErrors(req, err));
        }

        // DELETE /stream/:stream_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            var stream_id = req.params.stream_id;
            this._models.Stream.destroy({where: { id: stream_id }}).then(() => {
                res.json({ stat: 'OK' });
            });
        }

    }
    
});
