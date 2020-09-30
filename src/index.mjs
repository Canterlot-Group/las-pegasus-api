import http       from 'http';
import express    from 'express';
import sequelize  from 'sequelize';

import config from './config.mjs';
import routes from './routes.mjs';
import modelConstructor from './models.mjs';

import Icecast   from './icecast.mjs';
import Scheduler from './scheduler.mjs';
import Socket    from './socket.mjs';
import Storage   from './storage.mjs';

import middleware from './middleware.mjs';

import 'colors';
'use strict';

const storage = new Storage(config.file_storage_path);

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
const Song        = new routes.Song        (seq, models, sequelize.Op, storage);
const Comment     = new routes.Comment     (seq, models, sequelize.Op);
const Show        = new routes.Show        (seq, models, sequelize.Op);
const Episode     = new routes.Episode     (seq, models, sequelize.Op);// storage);
const Playlist    = new routes.Playlist    (seq, models, sequelize.Op);
const Bumper      = new routes.Bumper      (seq, models, sequelize.Op);// storage);
const History     = new routes.History     (seq, models, sequelize.Op);

//// >> GET,    eg. list, search
//// >> POST,   eg. create, validate
//// >> PUT,    eg. edit
//// >> DELETE, eg. remove


// Users

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

Router.post('/user',              (...args) => User.create(...args));
Router.post('/user/validate',     (...args) => User.validate(...args));
Router.post('/user/:user_id/key', (...args) => Key.create(...args));
Router.post('/user/:user_id/session/:session_id/validate', (...args) => Session.validate(...args));
Router.post('/user/:user_id/favourite/:song_id',           (...args) => Favourite.create(...args));
Router.post('/user/:user_id/favorite/:song_id',            (...args) => Favourite.create(...args));
Router.post('/user/:user_id/achievement',                  (...args) => Achievement.create(...args));

Router.put('/user/:user_id', (...args) => User.edit(...args));

Router.delete('/user/:user_id/session/:session_id', (...args) => Session.delete(...args));
Router.delete('/user/:user_id/key/:key',            (...args) => Key.delete(...args));
Router.delete('/user/:user_id',                     (...args) => User.delete(...args));
Router.delete('/user/:user_id/favourite/:song_id',  (...args) => Favourite.delete(...args));
Router.delete('/user/:user_id/favorite/:song_id',   (...args) => Favourite.delete(...args));
Router.delete('/user/:user_id/achievement/:achievement_id', (...args) => Achievement.delete(...args));

// Badges

Router.get('/badges',          (...args) => Badge.getAll(...args));
Router.get('/badge/:badge_id', (...args) => Badge.getOne(...args));

Router.post('/badge',          (...args) => Badge.create(...args));

Router.put('/badge/:badge_id', (...args) => Badge.edit(...args));

Router.delete('/badge/:badge_id', (...args) => Badge.delete(...args));

// Artists

Router.get('/artists',           (...args) => Artist.getAll(...args));
Router.get('/artist/:artist_id', (...args) => Artist.getOne(...args));

Router.post('/artist', (...args) => Artist.create(...args));

Router.put('/artist/:artist_id', (...args) => Artist.edit(...args));

Router.delete('/artist/:artist_id', (...args) => Artist.delete(...args));

// Streams

Router.get('/streams',                 (...args) => Stream.getAll(...args));
Router.get('/stream/:stream_id',       (...args) => Stream.getOne(...args));
Router.get('/stream/:stream_id/songs', (...args) => Stream.getSongs(...args));
Router.get('/stream/:stream_id/shows', (...args) => Show.getAllByStream(...args));
Router.get('/stream/:stream_id/history',       (...args) => History.getAll(...args));
Router.get('/stream/:stream_id/history/:date', (...args) => History.getAllByDate(...args));

Router.post('/stream', (...args) => Stream.create(...args));

Router.delete('/stream/:stream_id', (...args) => Stream.delete(...args));

// Songs

Router.get('/songs',                      (...args) => Song.getAll(...args));
Router.get('/song/random',                (...args) => Song.getRandom(...args));
Router.get('/song/:song_id',              (...args) => Song.getOne(...args));
Router.get('/song/:song_id/favourites',   (...args) => Favourite.countBySong(...args));
Router.get('/song/:song_id/favorites',    (...args) => Favourite.countBySong(...args));

Router.post('/song', (...args) => Song.create(...args));

Router.put('/song/:song_id', (...args) => Song.edit(...args));

Router.delete('/song/:song_id', (...args) => Song.delete(...args));

// Albums

Router.get('/albums',          (...args) => Album.getAll(...args));
Router.get('/album/:album_id', (...args) => Album.getOne(...args));

Router.post('/album', (...args) => Album.create(...args));

Router.delete('/album/:album_id', (...args) => Album.delete(...args));

// Comments

Router.get('/comment/:comment_id', (...args) => Comment.findOne(...args));

Router.post('/user/:user_id/comment/:song_id', (...args) => Comment.create(...args));

Router.put('/user/:user_id/comment/:comment_id', (...args) => Comment.edit(...args));

Router.delete('/user/:user_id/comment/:comment_id', (...args) => Comment.delete(...args));

// Shows

Router.get('/show/:show_id',          (...args) => Show.getOne(...args));
Router.get('/shows',                  (...args) => Show.getAll(...args));
Router.get('/show/:show_id/episodes', (...args) => Episode.getAllByShow(...args));
Router.get('/show/:show_id/episode/:ep_number', (...args) => Episode.getOneByEpisodeNumber(...args));
Router.get('/episodes',                         (...args) => Episode.getAll(...args));
Router.get('/episode/:episode_id',              (...args) => Episode.getOne(...args));

Router.post('/show',                  (...args) => Show.create(...args));
Router.post('/show/:show_id/episode', (...args) => Episode.create(...args));

Router.put('/show/:show_id',                    (...args) => Show.edit(...args));
Router.put('/show/:show_id/episode/:ep_number', (...args) => Episode.edit(...args));

Router.delete('/show/:show_id',                    (...args) => Show.delete(...args));
Router.delete('/show/:show_id/episode/:ep_number', (...args) => Episode.delete(...args));

// Playlists

Router.get('/playlist/:playlist_id',   (...args) => Playlist.getOne(...args));
Router.get('/playlists',               (...args) => Playlist.getAll(...args));
Router.get('/playlists/by_date/:date', (...args) => Playlist.getAllByDate(...args));

Router.post('/playlist', (...args) => Playlist.create(...args));

Router.put('/playlist/:playlist_id', (...args) => Playlist.edit(...args));

Router.delete('/playlist/:playlist_id', (...args) => Playlist.delete(...args));

// Bumpers

Router.get('/bumper/relevant',   (...args) => Bumper.getRelevant(...args));
Router.get('/bumper/:bumper_id', (...args) => Bumper.getOne(...args));
Router.get('/bumpers',           (...args) => Bumper.getAll(...args));

Router.post('/bumper', (...args) => Bumper.create(...args));

Router.delete('/bumper/:bumper_id', (...args) => Bumper.delete(...args));


app.use(Router);
app.use((req, res) => res.status(404).json({ stat: 'Err', err: 'route not found' }));

server.listen(process.env.PORT || config.http_port || 8000);
export default app;
