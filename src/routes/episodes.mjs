'use strict';

export default (RouteInterface => {

    return class Show extends RouteInterface {

        // GET /show/:show_id
        getOne(req, res) {
            var show_id = req.params.show_id;
            this._models.Show.findByPk(
                show_id,
                {include: [
                    { model: this._models.Episode, attributes: ['id', 'name'] },
                    { model: this._models.User, attributes: ['id', 'name'] }
                ]}).then(show => res.json({ stat: 'OK', show: show }));
        }

        // GET /episodes
        getAll(req, res) {
            this._models.Episode.findAndCountAll(this._paginate(req, {include: [
                {model: this._models.Show, attributes: ['id', 'name']},
                {model: this._models.User, attributes: ['id', 'name']}
            ]})).then(shows => res.json({ stat: 'OK', shows: shows }));
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

    }
    
});
