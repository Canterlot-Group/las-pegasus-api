'use strict';

export default (RouteInterface => {


    return class Badge extends RouteInterface {

        // GET /badge/:badge_id
        getOne(req, res) {
            return this._models.Badge.findByPk(req.params.badge_id, {
                }).then(badge => res.json({ stat: 'OK', badge: badge })).catch(err => this._handleErrors(err));
        }

        // GET /badges
        getAll(req, res) {
            return this._models.Badge.findAndCountAll(this._paginate(req))
                .then(badges => res.json({ stat: 'OK', badges: badges }));
        }

        // POST /badge
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            delete req.body.id;

            this._models.Badge.create(req.body).then(badge => res.json({ stat: 'OK', BadgeId: badge.id }))
                .catch(err => this._handleErrors({req, res}, err));
        }

        // PUT /badge/:badge_id
        edit(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            delete req.body.id;
                
            this._models.Badge.update(req.body, {where: { id: req.params.badge_id }})
                .then(() => res.json({ stat: 'OK' })).catch(err => this._handleErrors({req, res}, err));
        }

        // DELETE /badge/:badge_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            this._models.Badge.destroy({ where: { id: req.params.badge_id } })
                .then(() => res.json({ stat: 'OK' })).catch(err => this._handleErrors({req, res}, err));
        }

    }


});
