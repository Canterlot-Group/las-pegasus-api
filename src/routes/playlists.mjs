'use strict';

export default (RouteInterface => {

    return class Playlist extends RouteInterface {
        // untested!

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

        // GET /playlist/by_date/:date
        getAllBetweenDates(req, res) {
            var d = req.params.date;
            this._models.Playlist.findAndCountAll(this._paginate(req,
                {
                    where: {
                        [Op.or]: [ // 'd' should be between start date and end date
                            {emissionDate: {
                                [Op.lte]: d 
                            }},
                            {finishDate: {
                                [Op.gte]: d
                            }}
                        ]
                    },
                    order: ['emissionDate', 'ASC'],
                    include: [
                        {model: this._models.Stream},
                        {model: this._models.User, attributes: ['id', 'name']}
            ]})).then(playlists => res.json({ stat: 'OK', playlists: playlists }));
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

        /*
        // PUT /show/:show_id
        edit(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            var belongs_to = req.body.users || [];

            delete req.body.id;
            this._models.Show.update(req.body, {where: { id: req.params.show_id }})
            .then(show => {
                show.setUsers(belongs_to).then(() => res.json({ stat: 'OK' }))
                    .catch(e => this._handleErrors({req, res}, e));
            }).catch(err => this._handleErrors({req, res}, err));
        }

        // DELETE /show/:show_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            this._models.Show.destroy({where: { id: req.params.show_id }}).then(() => {
                res.json({ stat: 'OK' });
            });
        }

        */

    }
    
});
