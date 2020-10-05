const config = {

    cors_origin: '*',
    http_port: 8000,
    sequelize_verbose: false,
    morgan_log_level: 'combined', // https://github.com/expressjs/morgan
    db: {
        address: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '1234',
        database: 'laspegasus'
    },
    authorization_enabled: true, // ENABLE ON PRODUCTION!
    fallback_apikey: 'LLLLLLQLLLLQLLLLLQLLLLLLLLQLLLL', // Keep empty to disable.
    max_apikeys: 5,
    icecast_url: 'https://vinyl.laspegas.us:8080',
    file_storage_path: 'C:\\LPTest\\',
    queue_size: [5, 10], // [min, max] - scheduler queue size

}

export default config;
