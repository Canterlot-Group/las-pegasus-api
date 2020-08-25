'use strict';

export default (RouteInterface => {

    return class Key extends RouteInterface {

        // GET /user/:user_id/keys
        getAllByUser(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var user_id = req.params.user_id;
            this._models.ApiKey.findAll({where: {UserId: user_id}}).then(keys => {
                res.json({ stat: 'OK', keys: keys });
            })
        }

        // POST /user/:user_id/key
        create(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var user_id = req.params.user_id;
            var key_limit = 6;

            this._models.ApiKey.count({ where: {UserId: user_id} }).then(key_count => {

                if (key_count <= key_limit) {

                    this._models.ApiKey.create({ key: null, UserId: user_id }).then(
                        apikey => res.json({ stat: 'OK', key: apikey.key })
                    ).catch(err => this._handleErrors(err));

                } else {
                    res.json({ stat: 'Err', error: 'reached key limit' });
                }

            });

        }

        // DELETE /user/:user_id/key/:key
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var user_id = req.params.user_id;
            var key = req.params.key;

            this._models.ApiKey.destroy({where: { UserId: user_id, key: key }})
                .then(() => res.json({ stat: 'OK' }));
        }

    }
    
});
