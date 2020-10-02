'use strict';

export default (RouteInterface => {

    return class Bumper extends RouteInterface {

        constructor(seq, models, ops, storage) {
            super(seq, models, ops);
            this._stor = storage;
        }

        // GET /bumper/relevant
        getRelevant(req, res) {
            if (!this._hasRank({req, res}, 'member'))
                return this._denyPermission({req, res});

            this._models.Bumper.findAll({
                where: this._seq.literal(`(
                    ((emissionDate < NOW() AND finishDate > NOW() )
                        AND ((timeframeStart IS NULL)
                            OR ((TIME(NOW()) < timeframeEnd AND timeframeStart > timeframeEnd) OR (TIME(NOW()) > timeframeStart AND TIME(NOW()) < timeframeEnd))))
                    OR ((emissionDate IS NULL)
                        AND ((timeframeStart IS NULL)
                            OR ((TIME(NOW()) < timeframeEnd AND timeframeStart > timeframeEnd) OR (TIME(NOW()) > timeframeStart AND TIME(NOW()) < timeframeEnd))))
                )`)
            }).then(bumper => res.json({ stat: 'OK', bumper: bumper }));
        }

        // GET /bumper/:bumper_id
        getOne(req, res) {
            if (!this._hasRank({req, res}, 'member'))
                return this._denyPermission({req, res});

            var bumper_id = req.params.bumper_id;
            this._models.Bumper.findByPk(
                bumper_id,
                {include: [ this._models.Stream ]}).then(bumper => res.json({ stat: 'OK', bumper: bumper }));
        }

        // GET /bumpers
        getAll(req, res) {
            if (!this._hasRank({req, res}, 'member'))
                return this._denyPermission({req, res});
                
            this._models.Bumper.findAndCountAll(this._paginate(req, {include: [
                {model: this._models.Stream},
            ]})).then(bumpers => res.json({ stat: 'OK', bumpers: bumpers }));
        }

        // POST /bumper
        create(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            delete req.body.id;

            this._models.Bumper.create(req.body).then(bumper => {

                this._stor.save(`${bumper.id}`, 'bumpers', req.body.bumperEncoded).then(save_result => {

                    if (save_result != 'ok') {
                        bumper.destroy();
                        console.error(`Error while saving file: ${save_result}`);
                        res.json({ stat: 'err', error: save_result });
                    } else
                        res.json({ stat: 'OK', bumper_id: bumper.id });

                });

            }).catch(e => this._handleErrors({req, res}, e));
        }

        // DELETE /bumper/:bumper_id
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            this._models.Bumper.destroy({where: { id: req.params.bumper_id }}).then(() => {
                this._stor.delete(req.params.bumper_id, 'bumpers');
                res.json({ stat: 'OK' });
            });
        }

    }
    
});
