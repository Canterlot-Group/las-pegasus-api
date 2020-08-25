'use strict';

export default (RouteInterface => {


    return class Achievement extends RouteInterface {

        // GET /user/:user_id/achievement/:achievement_id
        getOne(req, res) {
            return this._models.Achievement.findByPk(req.params.achievement_id, {
                }).then(achievement => res.json({ stat: 'OK', achievement: achievement }))
                .catch(err => this._handleErrors(err));
        }

        // GET /user/:user_id/achievements
        getAll(req, res) {
            return this._models.Achievement.findAndCountAll(this._paginate(req))
                .then(achievements => res.json({ stat: 'OK', achievements: achievements }));
        }

        // POST /user/:user_id/achievement
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            var badge_id = req.body.badge_id;
            var user_id = req.params.user_id;

            this._models.Achievement.create({ UserId: user_id, BadgeId: badge_id })
            .then(achievement => res.json({ stat: 'OK', id: achievement.id }))
            .catch(err => this._handleErrors({req, res}, err));
        }

        // DELETE /user/:user_id/achievement/:achievement_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            this._models.Achievement.destroy({ where: { id: req.params.achievement_id } })
                .then(() => res.json({ stat: 'OK' })).catch(err => this._handleErrors({req, res}, err));
        }

    }


});
