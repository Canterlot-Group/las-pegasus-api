'use strict';

export default (RouteInterface => {

    return class Session extends RouteInterface {

        // GET /user/:user_id/session/:session_id
        getOne(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var user_id = req.params.user_id;
            var session_id = req.params.session_id;
            this._models.Session.findOne({ where: {UserId: user_id, SessionId: session_id} })
                .then(session => res.json({ stat: 'OK', session: session }));
        }

        // GET /user/:user_id/sessions
        getAll(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var user_id = req.params.user_id;
            this._models.Session.findAll({where: {UserId: user_id}}).then(
                sessions => res.json({ stat: 'OK', sessions: sessions }));
        }

        // POST /user/:user_id/session/:session_id/validate
        validate(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var user_id = req.params.user_id;
            var session_id = req.params.session_id;
            var user_agent = req.header('User-Agent') || 'unknown';
            var ip_address = req.header('x-forwarded-for') || req.connection.remoteAddress;
            //var ip_address = req.connection.remoteAddress; // use this instead if you must use express without reverse proxy although not recommended

            this._models.Session.findOne({where: {
                userId: user_id, sessionId: session_id,
                userAgent: user_agent, ipAddress: ip_address
            }}).then(session => {
                if (session) {
                    session.changed('updatedAt', true);
                    session.save();
                    res.json({ stat: 'OK', valid: true });
                } else
                    res.json({ stat: 'OK', valid: false });
            });
        }

        // DELETE /user/:user_id/session/:session_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin', true))
                return this._denyPermission({req, res});

            var user_id = req.params.user_id;
            var session_id = req.params.session_id;

            this._models.Session.destroy({where: {
                UserId: user_id, sessionId: session_id
            }}).then(() => res.json({ stat: 'OK' }));
        }

    }
    
});
