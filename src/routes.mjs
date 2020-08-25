'use strict';
import util from 'util';

class RouteInterface {
    constructor(seq, models, ops) {

        this._seq    = seq;
        this._models = models;
        this._ops    = ops;

        this._RANK = {
            'anonymous': 0,
            'user':      1,
            'member':    2,
            'redactor':  3,
            'admin':     4
        };

        this._ERR = {
            '1452': '%s not exist',
            '1366': 'variable contains illegal type',
            'unique violation': '%s in use',
            'Validation error': '%s has unmet requirements',
            'notNull Violation': 'missing %s',
            'unknown': 'internal server error'
        }

    }

    // http = { express.js req, express.js res }
    _isRequestBodyEmpty(http) {

        var is_empty = typeof http.req.body !== 'object' || this._objectIsEmpty(http.req.body);
        return is_empty ? http.res.status(400).json({stat: 'Err', err: 'missing request body'}) : false;

    }

    /*
     *  http = { express.js req, express.js res }
     *  rank = this._RANK
     *  allow_sameuser = true to check if given :user_id belongs
     *  to X-Api-Session/X-Api-Key owner  */
    _hasRank(http, req_rank, allow_sameuser = false) {

        var cur_rank = http.res.locals.rank;
        var is_sameuser = (http.req.params.user_id === http.res.locals.user_id);

        return (cur_rank >= this._RANK[req_rank]) || (allow_sameuser && is_sameuser);

    }

    /*
     * http = { express.js req, express.js res }
     * err = { .catch(err) for sequelize query promise }
     */
    _handleErrors(http, err) {
        var error = err.errors ? err.errors.original || err.errors[0] : err.original;
        var error_type = String(error.type || error.errno);

        var answer = {stat: 'Err', err: this._ERR[error_type] || this._ERR.unknown};
        var http_code = answer.err == 'internal server error' ? 500 : 400;

        switch (error_type) {

            case '1452':
                answer.err = util.format(answer.err, (error.fields || err.fields).join(','));
                break

            case 'Validation error': // no 'break' because util.format from cases below is also needed for this
                answer.reason = error.validatorName;

            case 'unique violation':
            case 'notNull Violation':
                answer.err = util.format(answer.err, error.path);
                break

        }

        return http.res.status(http_code).json(answer);

    }

    _denyPermission(http) {
        return http.res.status(403).json({stat: 'Err', err: 'access denied'});
    }

    // obj = any object containing mixed variable types
    _onlyIntegers(obj) {
        return Object.values(obj).filter(v => { return typeof va == 'number'; });
    }

    // obj = any object containing mixed variable types
    _purgeNullValues(obj) {
        return Object.keys(obj).reduce((r,e) => {
            if (obj[e] !== null) r[e] = obj[e]; return r;
        }, {});
    }

    // obj = any object containing mixed variable types
    _objectIsEmpty(obj) {
        for (var i in obj) return false; return true;
    }

    // req = express.js req
    _paginate(req, options = {}) {
        var limit = 10;
        var page = parseInt(req.query.page) || 1;
        options.limit = limit;
        options.offset = limit * page - limit;
        return options;
    }

}

var routes = {};

import User from './routes/user.mjs';
routes.User = User(RouteInterface);

import Badge from './routes/badges.mjs';
routes.Badge = Badge(RouteInterface);

import Achievement from './routes/achievements.mjs';
routes.Achievement = Achievement(RouteInterface);

import Session from './routes/sessions.mjs';
routes.Session = Session(RouteInterface);

import Key from './routes/keys.mjs';
routes.Key = Key(RouteInterface);

import Favourite from './routes/favourites.mjs';
routes.Favourite = Favourite(RouteInterface);

import Artist from './routes/artists.mjs';
routes.Artist = Artist(RouteInterface);

import Stream from './routes/streams.mjs';
routes.Stream = Stream(RouteInterface);

import Album from './routes/albums.mjs';
routes.Album = Album(RouteInterface);

import Song from './routes/songs.mjs';
routes.Song = Song(RouteInterface);

import Comment from './routes/comments.mjs';
routes.Comment = Comment(RouteInterface);

import Show from './routes/shows.mjs';
routes.Show = Show(RouteInterface);

export default routes;
