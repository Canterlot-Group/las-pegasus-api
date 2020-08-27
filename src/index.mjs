import http       from 'http';
import express    from 'express';
import sequelize  from 'sequelize';

import config from './config.mjs';
import routes from './routes.mjs';
import modelConstructor from './models.mjs';

import Icecast   from './icecast.mjs';
import Scheduler from './scheduler.mjs';
import Socket    from './socket.mjs';

import middleware from './middleware.mjs';

import 'colors';
'use strict';

const seq = new sequelize(config.db.database, config.db.user, config.db.password, {
    host: config.db.address, port: config.db.port, dialect: 'mysql',
    pool: {max: 5, min: 0, acquire: 30000, idle: 10000},
    logging: config.sequelize_verbose ? (msg) => console.log(msg.grey) : false
});


const app = express();
const server = http.createServer(app);

seq.authenticate().then().catch(e => { console.error('Database unreachable;'.bold.red, e); process.exit(); });
const models = new (modelConstructor(seq, sequelize));

middleware(app, config, models);

if ( process.argv[2] && process.argv[2].startsWith('-s') )
    seq.sync({ force: (process.argv[2][2] == 'f') }).then(() => console.log('Database synchronized.'.green));
    // -s = sync, -sf = force sync


const Router = express.Router();

const User        = new routes.User        (seq, models, sequelize.Op);
const Badge       = new routes.Badge       (seq, models, sequelize.Op);
const Achievement = new routes.Achievement (seq, models, sequelize.Op);
const Session     = new routes.Session     (seq, models, sequelize.Op);
const Key         = new routes.Key         (seq, models, sequelize.Op);
const Favourite   = new routes.Favourite   (seq, models, sequelize.Op);
const Artist      = new routes.Artist      (seq, models, sequelize.Op);
const Stream      = new routes.Stream      (seq, models, sequelize.Op);
const Album       = new routes.Album       (seq, models, sequelize.Op);
const Song        = new routes.Song        (seq, models, sequelize.Op);
const Comment     = new routes.Comment     (seq, models, sequelize.Op);
const Show        = new routes.Show        (seq, models, sequelize.Op);

//// >> GET, eg. list, search
Router.get('/users',                   (...args) => User.getAll(...args));
Router.get('/user/:user_id',           (...args) => User.getOne(...args));
Router.get('/user/find/:search_query', (...args) => User.find(...args));
Router.get('/user/:user_id/keys',      (...args) => Key.getAllByUser(...args));
Router.get('/user/:user_id/sessions',            (...args) => Session.getAll(...args));
Router.get('/user/:user_id/session/:session_id', (...args) => Session.getOne(...args));
Router.get('/user/:user_id/favourites',          (...args) => Favourite.getAllByUser(...args));
Router.get('/user/:user_id/favorites',           (...args) => Favourite.getAllByUser(...args));
Router.get('/user/:user_id/achievements',                (...args) => Achievement.getAll(...args));
Router.get('/user/:user_id/achievement/:achievement_id', (...args) => Achievement.getOne(...args));

//// >> POST, eg. create, validate
Router.post('/user',              (...args) => User.create(...args));
Router.post('/user/validate',     (...args) => User.validate(...args));
Router.post('/user/:user_id/key', (...args) => Key.create(...args));
Router.post('/user/:user_id/session/:session_id/validate', (...args) => Session.validate(...args));
Router.post('/user/:user_id/favourite/:song_id',           (...args) => Favourite.create(...args));
Router.post('/user/:user_id/favorite/:song_id',            (...args) => Favourite.create(...args));
Router.post('/user/:user_id/achievement',                  (...args) => Achievement.create(...args));

//// >> PUT, eg. edit
Router.put('/user/:user_id', (...args) => User.edit(...args));

//// >> DELETE, eg. remove
Router.delete('/user/:user_id/session/:session_id', (...args) => Session.delete(...args));
Router.delete('/user/:user_id/key/:key',            (...args) => Key.delete(...args));
Router.delete('/user/:user_id',                     (...args) => User.delete(...args));
Router.delete('/user/:user_id/favourite/:song_id',  (...args) => Favourite.delete(...args));
Router.delete('/user/:user_id/favorite/:song_id',   (...args) => Favourite.delete(...args));
Router.delete('/user/:user_id/achievement/:achievement_id', (...args) => Achievement.delete(...args));


//// >> GET, eg. list, search
Router.get('/badges',          (...args) => Badge.getAll(...args));
Router.get('/badge/:badge_id', (...args) => Badge.getOne(...args));

//// >> POST, eg. create, validate
Router.post('/badge',          (...args) => Badge.create(...args));

//// >> PUT, eg. edit
Router.put('/badge/:badge_id', (...args) => Badge.edit(...args));

//// >> DELETE, eg. remove
Router.delete('/badge/:badge_id', (...args) => Badge.delete(...args));


//// >> GET, eg. list, search
Router.get('/artists',           (...args) => Artist.getAll(...args));
Router.get('/artist/:artist_id', (...args) => Artist.getOne(...args));

//// >> POST, eg. create, validate
Router.post('/artist', (...args) => Artist.create(...args));

//// >> PUT, eg. edit
Router.put('/artist/:artist_id', (...args) => Artist.edit(...args));

//// >> DELETE, eg. remove
Router.delete('/artist/:artist_id', (...args) => Artist.delete(...args));


//// >> GET, eg. list, search
Router.get('/streams',                 (...args) => Stream.getAll(...args));
Router.get('/stream/:stream_id',       (...args) => Stream.getOne(...args));
Router.get('/stream/:stream_id/songs', (...args) => Stream.getSongs(...args));
Router.get('/stream/:stream_id/shows', (...args) => Show.getAllByStream(...args));

//// >> POST, eg. create, validate
Router.post('/stream', (...args) => Stream.create(...args));

//// >> DELETE, eg. remove
Router.delete('/stream/:stream_id', (...args) => Stream.delete(...args));


//// >> GET, eg. list, search
Router.get('/songs',                    (...args) => Song.getAll(...args));
Router.get('/song/random',              (...args) => Song.getRandom(...args));
Router.get('/song/:song_id',            (...args) => Song.getOne(...args));
Router.get('/song/:song_id/favourites', (...args) => Favourite.countBySong(...args));
Router.get('/song/:song_id/favorites',  (...args) => Favourite.countBySong(...args));

//// >> POST, eg. create, validate
Router.post('/song', (...args) => Song.create(...args));

//// >> PUT, eg. edit
Router.put('/song/:song_id', (...args) => Song.edit(...args));

//// >> DELETE, eg. remove
Router.delete('/song/:song_id', (...args) => Song.delete(...args));


//// >> GET, eg. list, search
Router.get('/albums',          (...args) => Album.getAll(...args));
Router.get('/album/:album_id', (...args) => Album.getOne(...args));

//// >> POST, eg. create, validate
Router.post('/album', (...args) => Album.create(...args));

//// >> DELETE, eg. remove
Router.delete('/album/:album_id', (...args) => Album.delete(...args));


//// >> GET, eg. list, search
Router.get('/comment/:comment_id', (...args) => Comment.findOne(...args));

//// >> POST, eg. create, validate
Router.post('/user/:user_id/comment/:song_id', (...args) => Comment.create(...args));

//// >> PUT, eg. edit
Router.put('/user/:user_id/comment/:comment_id', (...args) => Comment.edit(...args));

//// >> DELETE, eg. remove
Router.delete('/user/:user_id/comment/:comment_id', (...args) => Comment.delete(...args));


//// >> GET, eg. list, search
Router.get('/show/:show_id', (...args) => Show.getOne(...args));
Router.get('/shows',         (...args) => Show.getAll(...args));

//// >> POST, eg. create, validate
Router.post('/show', (...args) => Show.create(...args));

//// >> PUT, eg. edit
Router.put('/show/:show_id', (...args) => Show.edit(...args));

//// >> DELETE, eg. remove
Router.delete('/show/:show_id', (...args) => Show.delete(...args));



app.use(Router);
app.use((req, res) => res.status(404).json({ stat: 'Err', err: 'route not found' }));

server.listen(process.env.PORT || config.http_port || 8000);
export default app;
