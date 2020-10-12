const config = {

    cors_origin: '*',
    http_port: 8000,
    ws_port: 8500,
    sequelize_verbose: false,
    morgan_log_level: 'combined', // https://github.com/expressjs/morgan
    db: {
        address: 'raspi.co.jp',
        port: 3306,
        user: 'lp',
        password: '1234',
        database: 'laspegasus'
    },
    authorization_enabled: true, // ENABLE ON PRODUCTION!
    fallback_apikey: 'LLLLLLQLLLLQLLLLLQLLLLLLLLQLLLL', // Keep empty to disable.
    max_apikeys: 5,
    icecast_url: 'https://vinyl.laspegas.us:8080',
    file_storage_path: '/home/alis/Desktop/lptest/',
    queue_size: [5, 10], // [min, max] - scheduler queue size

}

export default config;
