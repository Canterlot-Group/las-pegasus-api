'use strict';

export default (RouteInterface => {

    return class Show extends RouteInterface {

        // GET /episode/:episode_id
        getOne(req, res) {
            this._models.Episode.findByPk(
                req.params.episode_id,
                {include: [
                    { model: this._models.Show, attributes: ['id', 'name'] },
                    { model: this._models.User, attributes: ['id', 'name'] }
                ]}).then(episode => res.json({ stat: 'OK', episode: episode }));
        }

        // GET /show/:show_id/episode/:ep_number
        getOneByEpisodeNumber(req, res) {
            this._models.Episode.findOne({where: {
                ShowId: req.params.show_id,
                episodeNumber: req.params.ep_number
            }, include: [
                {model: this._models.User, attributes: ['id', 'name']}
            ]}).then(episode => res.json({ stat: 'OK', episode: episode }));
        }

        // GET /episodes
        getAll(req, res) {
            this._models.Episode.findAndCountAll(this._paginate(req, {include: [
                {model: this._models.Show, attributes: ['id', 'name'], include: this._models.Stream},
                {model: this._models.User, attributes: ['id', 'name']}
            ]})).then(episodes => res.json({ stat: 'OK', episodes: episodes }));
        }

        // GET /show/:show_id/episodes
        getAllByShow(req, res) {
            var sort = req.query.sort == 'date' ? 'emissionDate' : 'id';
            this._models.Episode.findAndCountAll(this._paginate(req,
                {where: {
                    ShowId: req.params.show_id,
                    emissionDate: {
                        [this._ops.or]: {
                            [this._ops.gte]: this._moment().toDate(),
                            [this._ops.eq]: null
                        }
                    }
                }, include: [
                {model: this._models.User, attributes: ['id', 'name']}
            ], order: [[sort, 'ASC']]})).then(episodes => res.json({ stat: 'OK', episodes: episodes }));
        }

        // POST /show/:show_id/episode
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            req.body.ShowId = req.params.show_id;
            var participants = req.body.users || [];

            delete req.body.id;
            this._models.Episode.create(req.body).then(show => {
                show.setUsers(participants).then(() => res.json({ stat: 'OK', id: show.id }))
                    .catch(e => this._handleErrors({req, res}, e));
            }).catch(e => this._handleErrors({req, res}, e));
            
        }

        // PUT /show/:show_id/episode/:ep_number
        edit(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            req.body.ShowId = req.params.show_id;
            var participants = req.body.users || [];

            delete req.body.id;
            this._models.Episode.update(req.body, {where: {
                ShowId: req.params.show_id, episodeNumber: req.params.ep_number
            }}).then(episode => {
                episode.setUsers(participants).then(() => res.json({ stat: 'OK' }))
                    .catch(e => this._handleErrors({req, res}, e));
            }).catch(err => this._handleErrors({req, res}, err));
        }

        // DELETE /show/:show_id/episode/:ep_number
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            this._models.Episode.destroy({where: {
                ShowId: req.params.show_id, episodeNumber: req.params.ep_number }})
                .then(() => res.json({ stat: 'OK' }));
        }

    }
    
});
