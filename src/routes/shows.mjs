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

        // GET /shows
        getAll(req, res) {
            this._models.Show.findAndCountAll(this._paginate(req, {include: [
                {model: this._models.Episode, attributes: ['id', 'name']},
                {model: this._models.User, attributes: ['id', 'name']}
            ]})).then(shows => res.json({ stat: 'OK', shows: shows }));
        }

        // GET /stream/:stream_id/shows
        getAllByStream(req, res) {
            this._models.Show.findAndCountAll(this._paginate(req,
                {where: {StreamId: req.params.stream_id}, include: [
                {model: this._models.Episode, attributes: ['id', 'name']},
                {model: this._models.User, attributes: ['id', 'name']}
            ]})).then(shows => res.json({ stat: 'OK', shows: shows }));
        }

        // POST /show
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            delete req.body.id;
            this._models.Show.create(req.body).then(show => {
                res.json({ stat: 'OK', id: show.id });
            }).catch(e => this._handleErrors({req, res}, e));
            
        }

        // PUT /show/:show_id
        edit(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            delete req.body.id;
            this._models.Show.update(req.body, {where: { id: req.params.show_id }})
            .then(show => res.json({ stat: 'OK' }))
            .catch(err => this._handleErrors({req, res}, err));
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
