'use strict';

export default (RouteInterface => {

    return class Comment extends RouteInterface {

        // GET /comment/:comment_id
        getOne(req, res) {
            var comment_id = req.params.comment_id;
            this._models.Comment.findByPk(
                comment_id,
                {include: [
                    { model: this._models.User, attributes: ['id', 'name'] },
                    this._models.Song
                ]}
                ).then(comment => res.json({ stat: 'OK', comment: comment }));
        }

        // GET /song/:song_id/comments
        getAllBySong(req, res) {
            this._models.Comment.findAndCountAll({
                where: { SongId: req.params.song_id },
                include: [
                    { model: this._models.User, attributes: ['id', 'name'] },
                    this._models.Song
                ]
            }).then(songs => res.json({ stat: 'OK', comments: comments }));
        }

        // POST /user/:user_id/comment/:song_id
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            delete req.body.id;
            req.body.UserId = req.params.user_id;
            req.body.SongId = req.params.song_id;

            var max_comments_per_song = 3;

            this._models.Comment.count({where: {UserId: req.body.UserId, SongId: req.body.SongId}}).then(commentCount => {

                if (commentCount >= max_comments_per_song)
                    return res.json({ stat: 'Err', error: 'comment limit reached' });

                this._models.Comment.create(req.body).then(comment => {
                    res.json({ stat: 'OK', id: comment.id });
                }).catch(err => this._handleErrors({req, res}, err));

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
