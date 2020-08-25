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
            });
            
        }

        // PUT /user/:user_id/comment/:comment_id
        edit(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            this._models.Comment.update({content: req.body.content}, {where: { id: req.params.comment_id }})
            .then(comment => res.json({ stat: 'OK', id: comment.id })
            ).catch(err => this._handleErrors({req, res}, err));
        }

        // DELETE /user/:user_id/comment/:comment_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var comment_id = req.params.comment_id;
            this._models.Comment.destroy({where: { id: comment_id }}).then(() => {
                res.json({ stat: 'OK' });
            });
        }

    }
    
});
