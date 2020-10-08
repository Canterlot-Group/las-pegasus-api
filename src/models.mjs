import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
export default (seq, DataTypes) => class Models {
    constructor() {

        // --- -- --- -- --- -- --- -- ---
        // USER
        // --- -- --- -- --- -- --- -- ---
        this.User = seq.define('User', {
            id: {
                type: DataTypes.UUID,
                allowNull: true,
                primaryKey: true,
                validate: {isUUID: 4}
            },

            name: {
                type: DataTypes.STRING(18),
                allowNull: false,
                unique: true,
                validate: {isAlphanumeric: true, len: [4, 18]}
            },

            email: {
                type: DataTypes.STRING(96),
                allowNull: false,
                unique: true,
                validate: {isEmail: true, len: [6, 96]}
            },

            password: {
                type: DataTypes.STRING(64),
                allowNull: false,
                validate: {len: [8, 64]}
            },

            permissions: {
                type: DataTypes.INTEGER.UNSIGNED,
                defaultValue: 1,
                validate: {min: 0, max: 7}
            },

            loginEnabled: { // for accounts that only require access to the API
                type: DataTypes.BOOLEAN,
                defaultValue: true
            }
        });
        this.User.beforeCreate(async (user, options) => {
            user.password = await bcrypt.hash(user.password, 12);
            user.id = uuid();
        });

        // --- -- --- -- --- -- --- -- ---
        // BADGE
        // --- -- --- -- --- -- --- -- ---
        this.Badge = seq.define('Badge', {
            name: {
                type: DataTypes.STRING(64),
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                defaultValue: ''
            },
            points: {
                type: DataTypes.INTEGER,
                defaultValue: 25
            },
            icon: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            rarity: {
                type: DataTypes.STRING,
                defaultValue: 'bronze',
                validate: {isIn: [['none', 'bronze', 'silver', 'gold', 'platinum']]}
            }
        });

        // --- -- --- -- --- -- --- -- ---
        // ACHIEVEMENTS
        // --- -- --- -- --- -- --- -- ---
        this.Achievement = seq.define('Achievement', {});

        this.Achievement.belongsTo(this.Badge);
        this.Badge.hasMany(this.Achievement);
        
        this.Achievement.belongsTo(this.User);
        this.User.hasMany(this.Achievement);

        // --- -- --- -- --- -- --- -- ---
        // SESSION
        // --- -- --- -- --- -- --- -- ---
        this.Session = seq.define('Session', {
            sessionId: {
                type: DataTypes.STRING(52),
                validate: {is: /^[a-zA-Z0-9]+\:\:[a-zA-Z0-9]{32}$/i, len: [32, 52]},
                primaryKey: true,
                unique: true
            },
            ipAddress: {
                type: DataTypes.STRING(46),
                validate: {isIP: true}
            },
            userAgent: {
                type: DataTypes.STRING(200),
                allowNull: false
            }
        });

        this.Session.belongsTo(this.User);
        this.User.hasMany(this.Session);

        // --- -- --- -- --- -- --- -- ---
        // API KEYS
        // --- -- --- -- --- -- --- -- ---
        this.ApiKey = seq.define('ApiKey', {
            key: {
                type: DataTypes.STRING(36),
                allowNull: true,
                primaryKey: true,
                unique: true
            }
        });
        this.ApiKey.beforeCreate(
            async (apikey, options) => apikey.key = uuid());

        this.ApiKey.belongsTo(this.User);
        this.User.hasMany(this.ApiKey);

        // --- -- --- -- --- -- --- -- ---
        // STREAMS
        // --- -- --- -- --- -- --- -- --- 
        this.Stream = seq.define('Stream', {
            name: {
                type: DataTypes.STRING(64),
                allowNull: false
            },
            format: {
                type: DataTypes.STRING(24),
                defaultValue: 'Unknown'
            },
            bitrate: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
                defaultValue: 192
            },
            icecast_uri: {
                type: DataTypes.STRING(96),
                allowNull: false
            },
            is_mirror: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            mirror_of: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
                defaultValue: null
            }
        });

        // --- -- --- -- --- -- --- -- ---
        // ARTISTS
        // --- -- --- -- --- -- --- -- ---
        this.Artist = seq.define('Artist', {
            name: {
                type: DataTypes.STRING(64),
                allowNull: false,
                unique: true
            },
            location: {
                type: DataTypes.STRING(64),
                allowNull: true
            },
            description: {
                type: DataTypes.TEXT,
                defaultValue: ''
            },
            bandcamp: {
                type: DataTypes.STRING(1024),
                allowNull: true,
                validate: {isUrl: true} // due to Bandcamp's functionality to use
            },                          // custom domains; domain check is disabled
            youtube: {
                type: DataTypes.STRING(1024),
                allowNull: true,
                validate: {isUrl: true, contains: 'youtu'} // youtube.com, youtu.be
            },
            twitter: {
                type: DataTypes.STRING(1024),
                allowNull: true,
                validate: {isUrl: true, contains: 'twitter.com'}
            }
        });

        this.Artist.belongsTo(this.User);
        this.User.hasOne(this.Artist);

        // --- -- --- -- --- -- --- -- ---
        // ALBUMS
        // --- -- --- -- --- -- --- -- ---
        this.Album = seq.define('Album', {
            name: {
                type: DataTypes.STRING(96),
                allowNull: false
            }
        });

        this.Album.belongsToMany(this.Artist, { through: 'z_Artist_Albums' });
        this.Artist.belongsToMany(this.Album, { through: 'z_Artist_Albums' });

        // --- -- --- -- --- -- --- -- ---
        // SONGS
        // --- -- --- -- --- -- --- -- ---
        this.Song = seq.define('Song', {
            title: {
                type: DataTypes.STRING(128),
                allowNull: false
            },
            genre: {
                type: DataTypes.STRING(64),
                defaultValue: 'Unknown'
            },
            lyrics: { // lines should be separated with \n
                type: DataTypes.TEXT,
                defaultValue: ''
            },
            public: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            length: { // Length of the song in seconds
                type: DataTypes.INTEGER.UNSIGNED
            }
        });

        this.Song.belongsTo(this.Album);
        this.Album.hasMany(this.Song);

        this.Song.belongsToMany(this.Artist, { through: 'z_Artist_Songs' });
        this.Song.belongsToMany(this.Stream, { through: 'z_Stream_Songs' });
        
        // --- -- --- -- --- -- --- -- ---
        // FAVOURITES
        // --- -- --- -- --- -- --- -- ---
        this.Favourite = seq.define('Favourite', {});

        this.Favourite.belongsTo(this.User);
        this.Favourite.belongsTo(this.Song);

        this.User.hasMany(this.Favourite);
        this.Song.hasMany(this.Favourite);


        // --- -- --- -- --- -- --- -- ---
        // COMMENTS
        // --- -- --- -- --- -- --- -- ---
        this.Comment = seq.define('Comment', {
            timestamp: {
                type: DataTypes.INTEGER.UNSIGNED
            },
            content: {
                type: DataTypes.STRING(128),
                validate: {notEmpty: true, is: /^[\x00-\x7F]+$/i} // only ASCII
            }
        });

        this.Comment.belongsTo(this.User);
        this.User.hasMany(this.Comment);

        this.Comment.belongsTo(this.Song);
        this.Song.hasMany(this.Comment);

        // --- -- --- -- --- -- --- -- ---
        // SHOWS
        // --- -- --- -- --- -- --- -- ---
        this.Show = seq.define('Show', {
            name: {
                type: DataTypes.STRING(128),
                unique: true
            },
            description: {
                type: DataTypes.TEXT,
                defaultValue: ''
            },
            type: {
                type: DataTypes.STRING(32),
                defaultValue: 'live',
                validate: {isIn: [['live', 'podcast']]}
            }
        });

        this.Show.belongsToMany(this.User, { through: 'z_User_Shows' });
        this.User.belongsToMany(this.Show, { through: 'z_User_Shows' });

        this.Show.belongsTo(this.Stream, { constraints: true });
        this.Stream.hasMany(this.Show);

        // --- -- --- -- --- -- --- -- ---
        // EPISODES
        // --- -- --- -- --- -- --- -- ---
        this.Episode = seq.define('Episode', {
            episodeNumber: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            },
            name: {
                type: DataTypes.STRING(128)
            },
            description: {
                type: DataTypes.TEXT,
                defaultValue: ''
            },
            mediaType: {
                type: DataTypes.STRING(6),
                defaultValue: 'audio',
                validate: {isIn: [['audio', 'video']]}
            },
            emissionDate: {
                type: DataTypes.DATE
            },
            safeForWork: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            safeToArchive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            tracklist: { // if null regular episode, else json with song IDs and/or filenames to custom songs
                type: DataTypes.JSON,
                allowNull: true
            }
        });

        this.Episode.belongsTo(this.Show);
        this.Show.hasMany(this.Episode);

        this.Episode.belongsToMany(this.User, { through: 'z_User_Episodes' });
        this.User.belongsToMany(this.Episode, { through: 'z_User_Episodes' });

        // --- -- --- -- --- -- --- -- ---
        // PLAYLISTS
        // --- -- --- -- --- -- --- -- ---

        this.Playlist = seq.define('Playlist', {
            name: {
                type: DataTypes.STRING(128),
                unique: true
            },
            sort: {
                type: DataTypes.STRING(32),
                defaultValue: 'ordered',
                validate: {isIn: [['ordered', 'shuffle', 'randomByHours']]}
            },
            emissionDate: {
                type: DataTypes.DATE,
                allowNull: false
            },
            finishDate: { // if sort == randomByHours then not null, else allow null
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: null
            },
            priority: {
                type: DataTypes.INTEGER(2).UNSIGNED,
                defaultValue: 10
            },
            songs: { // Songs IDs with set ordering
                type: DataTypes.JSON
            },
            description: {
                type: DataTypes.TEXT,
                defaultValue: ''
            },
            allowQueue: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        });

        this.Playlist.belongsTo(this.Stream);
        this.Stream.hasMany(this.Playlist);

        this.Playlist.belongsTo(this.User);
        this.User.hasMany(this.Playlist);


        // --- -- --- -- --- -- --- -- ---
        // BUMPERS
        // --- -- --- -- --- -- --- -- ---

        this.Bumper = seq.define('Bumper', {
            name: {
                type: DataTypes.STRING(128),
                unique: true
            },
            repeatEvery: { // days
                type: DataTypes.INTEGER,
            },
            timeframeStart: { type: DataTypes.TIME },
            timeframeEnd: { type: DataTypes.TIME },
            emissionDate: { type: DataTypes.DATE },
            finishDate: { type: DataTypes.DATE },
            rarity: {
                type: DataTypes.FLOAT(4, 3),
                defaultValue: 0.1,
                allowNull: false
            }
        });

        this.Bumper.belongsTo(this.Stream, {constraints: true});
        this.Stream.hasMany(this.Bumper);

        // --- -- --- -- --- -- --- -- ---
        // CHAT LOGS
        // --- -- --- -- --- -- --- -- ---

        this.ChatLog = seq.define('ChatLog', {
            destination: {
                type: DataTypes.STRING(120)
            },
            content: {
                type: DataTypes.STRING(280),
                allowNull: false
            }
        });

        this.ChatLog.belongsTo(this.User);
        this.User.hasMany(this.ChatLog);


        // --- -- --- -- --- -- --- -- ---
        // PLAYBACK HISTORY
        // --- -- --- -- --- -- --- -- ---
        this.HistoryEntry = seq.define('HistoryEntry', {
            timestamp: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: seq.NOW
            },
            listeners: {
                type: DataTypes.INTEGER.UNSIGNED,
                defaultValue: 0
            },
            skipped: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: null
            },
            entryType: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: { isIn: [['song', 'episode', 'bumper']] }
            }
        });

        this.HistoryEntry.belongsTo(this.Stream);
        this.Stream.hasMany(this.HistoryEntry);

        // Random song: only Song, else NULL
        // Song from Playlist: Song and Playlist, else NULL
        // Episode from Show: Episode, else NULL
        // Bumper: Bumper else NULL

        this.HistoryEntry.belongsTo(this.Song);
        this.Song.hasMany(this.HistoryEntry);

        this.HistoryEntry.belongsTo(this.Playlist);
        this.Playlist.hasMany(this.HistoryEntry);

        this.HistoryEntry.belongsTo(this.Episode);
        this.Episode.hasMany(this.HistoryEntry);

    }
    
}
