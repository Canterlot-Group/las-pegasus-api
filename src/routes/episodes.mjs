'use strict';
import { v4 as uuidv4 } from 'uuid';

export default (RouteInterface => {

    return class Episode extends RouteInterface {

        constructor(seq, models, ops, storage) {
            super(seq, models, ops);
            this._stor = storage;
        }

        // GET /episode/:episode_id
        getOne(req, res) {
            this._models.Episode.findByPk(
                req.params.episode_id,
                {include: [
                    { model: this._models.Show, attributes: ['id', 'name'] },
                    { model: this._models.User, attributes: ['id', 'name'] }
                ]}).then(episode => res.json({ stat: 'OK', episode: episode }));
        }

        // GET /show/:show_id/episode/:ep_number
        getOneByEpisodeNumber(req, res) {
            this._models.Episode.findOne({where: {
                ShowId: req.params.show_id,
                episodeNumber: req.params.ep_number
            }, include: [
                {model: this._models.User, attributes: ['id', 'name']}
            ]}).then(episode => res.json({ stat: 'OK', episode: episode }));
        }

        // GET /episodes
        getAll(req, res) {
            this._models.Episode.findAndCountAll(this._paginate(req, {include: [
                {model: this._models.Show, attributes: ['id', 'name'], include: this._models.Stream},
                {model: this._models.User, attributes: ['id', 'name']}
            ]})).then(episodes => res.json({ stat: 'OK', episodes: episodes }));
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
            if (!req.body.episodeEncoded && !req.body.tracklist)
                return res.json({ stat: 'err', error: 'missing file or tracklist' })

            if (req.body.tracklist) {

                req.body.episodeEncoded = null;
                for (var i = 0; i < req.body.tracklist.length; i++) {
                    console.log(Object.keys(req.body.tracklist[i]));
                    let object_schema = {type: '', title: '', art: '', base64: ''};
                    Object.keys(req.body.tracklist[i]).every(
                        k => { if (!(k in object_schema)) res.json({ stat: 'err', error: 'tracklist incorrect' }) });

                    if (req.body.tracklist[i].type == 'custom')
                        req.body.tracklist[i].filename = uuidv4();
                    else
                        return res.json({ stat: 'err', error: 'tracklist incorrect' });

                }
                var tracklist_w_b64 = req.body.tracklist;
                req.body.tracklist = req.body.tracklist.map(({ base64, ...keepAttrs }) => keepAttrs);
            }

            this._models.Episode.create(req.body).then(episode => {
                episode.setUsers(participants).then(() => {

                    this._stor.save(`${episode.id}`, 'episodes', tracklist_w_b64 || req.body.episodeEncoded).then(save_result => {

                        if (save_result != 'ok') {
                            episode.destroy();
                            console.error(`Error while saving file: ${save_result}`);
                            res.json({ stat: 'err', error: save_result });
                        } else
                            res.json({ stat: 'OK', episode_id: episode.id });

                    });

                }).catch(e => this._handleErrors({req, res}, e));
            }).catch(e => this._handleErrors({req, res}, e));
            
        }

        // PUT /show/:show_id/episode/:ep_number
        edit(req, res) {
            if (this._isRequestBodyEmpty({req, res})) return;
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            req.body.ShowId = req.params.show_id;
            var participants = req.body.users || [];

            delete req.body.id;
            this._models.Episode.update(req.body, {where: {
                ShowId: req.params.show_id, episodeNumber: req.params.ep_number
            }}).then(episode => {
                episode.setUsers(participants).then(() => res.json({ stat: 'OK' }))
                    .catch(e => this._handleErrors({req, res}, e));
            }).catch(err => this._handleErrors({req, res}, err));
        }

        // DELETE /show/:show_id/episode/:ep_number
        delete(req, res) {
            if (!this._hasRank({req, res}, 'admin'))
                return this._denyPermission({req, res});

            this._models.Episode.findOne({
                where: {ShowId: req.params.show_id, episodeNumber: req.params.ep_number}
            }).then(ep => {
                
                if (ep === null) return res.json({ stat: 'Err', error: 'episode not exist' });

                this._models.Episode.destroy({ where: {id: ep.id} }).then(() => {
                    this._stor.delete(ep.id, 'episodes');
                    res.json({ stat: 'OK' });
                });
            });

        }

    }
    
});
