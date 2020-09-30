'use strict';

export default (RouteInterface => {

    return class History extends RouteInterface {

        // GET /stream/:stream_id/history
        getAll(req, res) {
            this._models.HistoryEntry.findAndCountAll(this._paginate(req, {where: {
                StreamId: req.params.stream_id
            }, include: [
                this._models.Song, this._models.Playlist, this._models.Episode
            ]})).then(entries => res.json({ stat: 'OK', entries: entries }));
        }

        // GET /stream/:stream_id/history/:date
        getAllByDate(req, res) {
            var date_to_seek = (new Date(req.params.date)).getTime();
            var range_to_seek = [ (date_to_seek - 1200000), (date_to_seek + 1200000) ];
            this._models.HistoryEntry.findAndCountAll(this._paginate(req, {
                    where: {
                        StreamId: req.params.stream_id,
                        timestamp: { // between time - 20 minutes and time + 20 minutes
                            [this._ops.between]: range_to_seek
                        }
                    },
                    include: [
                        this._models.Song, this._models.Playlist, this._models.Episode
                    ]
                })).then(playlists => res.json({ stat: 'OK', playlists: playlists }));
        }

    }
    
});
