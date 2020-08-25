'use strict';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export default (RouteInterface => {


    return class User extends RouteInterface {

        // GET /user/:user_id
        getOne(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            return this._models.User.findByPk(req.params.user_id, {
                include: [
                    { model: this._models.ApiKey },
                    { model: this._models.Session, attributes: { exclude: ['UserId'] } },
                    { model: this._models.Achievement, include: [this._models.Badge], attributes: {exclude: ['UserId', 'BadgeId', 'updatedAt']} }
                ],
                attributes: {include: [[this._seq.fn('SUM', this._seq.col('`Achievements->Badge`.`points`')), 'achievementScore']], exclude: ['password']}
                }).then(user => res.json({ stat: 'OK', user: user })).catch(err => this._handleErrors(err));
        }

        // GET /users
        getAll(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            return this._models.User.findAndCountAll(this._paginate(req,
                { include: [this._models.ApiKey, this._models.Session], attributes: { exclude: ['password'] } },
                )).then(users => res.json({ stat: 'OK', users: users }));
        }

        // GET /user/find/:search_query
        find(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            return this._models.User.findAndCountAll(this._paginate(req, {
                where: { name: {[this._ops.substring]: [req.params.search_query]} }, attributes: { exclude: ['password'] },
                include: [{ model: this._models.ApiKey }, { model: this._models.Session, attributes: {exclude: ['UserId']} }]
            })).then(users => res.json({ stat: 'OK', users: users }))
        }

        // POST /user
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            var disallowed_fields = ['id', 'loginEnabled', 'createdAt', 'updatedAt', 'permissions'];
            disallowed_fields.forEach(e => delete req.body[e]);

            var required_fields = ['name', 'email', 'password'];
            for (var i = 0; i < required_fields.length; i++)
                if (req.body[required_fields[i]] === undefined)
                    return res.status(400).json({ stat: 'Err', error: 'unmet requirements' });

            this._models.User.create(req.body).then(user => res.json({ stat: 'OK', UserId: user.id }))
                .catch(err => this._handleErrors({req, res}, err));
        }

        // POST /user/validate
        validate(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            var name = req.body.name;
            var password = req.body.password;
            var create_session = req.body.createSession || false;
            
            this._models.User.findOne({ where: {name: name}, include: this._models.Session })
                .then(async user => {

                    if (!user)
                        return res.json({ stat: 'Err', reason: 'user does not exist' });

                    await bcrypt.compare(password, user.password, (err, matched) => {
                        if (matched) {

                            var ip_address = req.connection.remoteAddress;
                            var user_agent = req.header('User-Agent') || 'unknown';
                            if (create_session) {
                                this._models.Session.create({ sessionId: this._createSessionId(user.name),
                                    ipAddress: ip_address, userAgent: user_agent, UserId: user.id}).then(
                                        session => res.json({ stat: 'OK', session: session.sessionId }));
                            } else
                                return res.json({ stat: 'OK' });

                        } else
                            return res.json({ stat: 'Err', reason: 'password incorrect' });
                    });


                });

        }

        // PUT /user/:user_id
        edit(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var disallowed_fields = ['id', 'name', 'loginEnabled', 'createdAt', 'updatedAt', 'permissions'];
            if (res.locals.rank < this._RANK.admin)
                disallowed_fields.forEach(e => delete req.body[e]);
                
            this._models.User.update(req.body, {where: { id: req.params.user_id }})
                .then(() => res.json({ stat: 'OK' })).catch(err => this._handleErrors({req, res}, err));
        }

        // DELETE /user/:user_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            this._models.User.destroy({ where: { id: req.params.user_id } })
                .then(() => res.json({ stat: 'OK' })).catch(err => this._handleErrors( {req, res}, err) );
        }

        _createSessionId(name) {
            return String(name + '::' + crypto.randomBytes(16).toString('hex'));
        }

    }


});
