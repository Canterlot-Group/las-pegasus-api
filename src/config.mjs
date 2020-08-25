const config = {

    cors_origin: '*',
    http_port: 8000,
    sequelize_verbose: true,
    morgan_log_level: 'combined', // https://github.com/expressjs/morgan
    db: {
        address: '172.17.0.2',
        port: 3306,
        user: 'user',
        password: '1234',
        database: 'peganode'
    },
    authorization_enabled: true, // ENABLE ON PRODUCTION!
    fallback_apikey: 'LLLLLLQLLLLQLLLLLQLLLLLLLLQLLLL', // Keep empty to disable.
    max_apikeys: 5,
    icecast_url: 'https://vinyl.laspegas.us:8080'

}

export default config;
