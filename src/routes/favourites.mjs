'use strict';

export default (RouteInterface => {

    return class Favourite extends RouteInterface {

        // GET /user/:user_id/favourites
        // GET /user/:user_id/favorites
        getAllByUser(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var user_id = req.params.user_id;
            this._models.Favourite.findAndCountAll(this._paginate(req, {
                include: [this._models.Song], where: {UserId: user_id }
            })).then(fav => res.json({ stat: 'OK', fav: fav }));

        }

        // GET /song/:song_id/favourites
        // GET /song/:song_id/favorites
        countBySong(req, res) {
            var song_id = req.params.song_id;
            this._models.Favourite.count({where: { SongId: song_id }})
                .then(fav_count => res.json({ stat: 'OK', count: fav_count }));
        }

        // POST /user/:user_id/favourite/:song_id
        // POST /user/:user_id/favorite/:song_id
        create(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var user_id = req.params.user_id;
            var song_id = req.params.song_id;

            this._models.Favourite.findOrCreate({where: { UserId: user_id, SongId: song_id }})
                .then(fav => {
                    if (fav[0]._options.isNewRecord)
                        return res.json({ stat: 'OK', favid: fav[0].id });
                    return res.json({ stat: 'Err', error: 'already exist' });
                });
        }

        // DELETE /user/:user_id/favourite/:song_id
        // DELETE /user/:user_id/favorite/:song_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var user_id = req.params.user_id;
            var song_id = req.params.song_id;

            this._models.Favourite.destroy({where: { UserId: user_id, SongId: song_id }}).then(() => {
                res.json({ stat: 'OK' });
            });
        }

    }
    
});
