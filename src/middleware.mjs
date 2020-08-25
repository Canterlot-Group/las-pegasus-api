import slowDown   from 'express-slow-down';
import helmet     from 'helmet';
import cors       from 'cors';
import morgan     from 'morgan';
import bodyParser from 'body-parser';
'use strict';


export default (app, config, models) => {

    // -- -- -- ---- -- -- ---- -- -- --
    const rateLimiter = slowDown({
        windowMs: 600000, delayAfter: 125, delayMs: 250
    });

    // -- -- -- ---- -- -- ---- -- -- --
    const bodyJson = bodyParser.json({
        limit: '4mb', verify: (req, res, buf, encoding) => {
            req.rawBody = buf.toString();
        }
    });

    // -- -- -- ---- -- -- ---- -- -- --
    const authenticate = async (req, res, next) => {

        var api_key = req.header('X-Api-Key') || false;
        var session = req.header('X-Api-Session') || false;
    
        var default_rank = models.User.rawAttributes.permissions.defaultValue;

        const end = (v => {
            var user_exist = (v !== null);
            res.locals.rank = user_exist ? v.User.permissions : default_rank;
            res.locals.user_id = user_exist ? v.UserId : null;
        });

        if (!config.authorization_enabled ||
            (config.fallback_apikey && config.fallback_apikey === api_key))
            res.locals.rank = 4;
            
        else if (session) {

            await models.Session.findOne({where: {
                sessionId: session,
                userAgent: req.header('User-Agent') || 'unknown',
                ipAddress: req.connection.remoteAddress
            }, include: models.User}).then(v => end(v));

        }

        else if (api_key)
            await models.ApiKey.findByPk(api_key, { include: models.User }).then(v => end(v));

        else
            res.locals.rank = 0;

        next();

    };
    

    // -- -- -- ---- -- -- ---- -- -- --
    app.use( helmet() );

    app.use( cors({ origin: config.cors_origin }) );

    app.use( rateLimiter );

    app.use( morgan(config.morgan_log_level) );

    app.use( (req, res, next) => {bodyJson(req, res, (err) => {
        if (err)
            return res.status(400).json({ stat: 'Err', error: 'invalid json' });
        next();
    })} );

    app.use( authenticate );

};
