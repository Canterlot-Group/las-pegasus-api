import fs from 'fs';
import path from 'path';
import fileType from 'file-type';
'use strict';

export default class Storage {

    valid_types = {songs: ['mp3', 'flac', 'ogg', 'opus'],
        arts:             ['jpg', 'jpeg', 'png', 'gif'],
        bumpers:          ['mp3', 'flac', 'ogg', 'opus'],
        episodes:         ['mp4', 'mp3', 'flac', 'ogg', 'opus']
    };

    constructor(storage_path) {
        if (!storage_path.endsWith(path.sep))
            storage_path += path.sep;

        try {
            fs.accessSync(storage_path, fs.W_OK | fs.R_OK);
        } catch(e) {
            console.error(`ERROR: "${storage_path}" has no read and/or write access!`.bold.red);
            process.exit();
        }

        var valid_types = Object.keys(this.valid_types);
        for (var i = 0; i < valid_types.length; i++)
            if (!fs.existsSync(storage_path + valid_types[i])) {
                fs.mkdirSync(storage_path + valid_types[i]);
                if (valid_types[i] == 'arts') // Generate empty file to make it easier to replace it with actual default cover art.
                    fs.closeSync(fs.openSync(storage_path + valid_types[i] + path.sep + 'album-default', 'w'));
            }

        this.path = storage_path;
    }


    async save(filename, type, data) {

        var type_of_data = typeof data === 'object' ? 'tracklist' : 'regular';

        if (!Object.keys(this.valid_types).includes(type))
            return 'type not exist';

        var full_path = (this.path + type + path.sep + filename);
        if (fs.existsSync(full_path)) {
            console.error(`WARNING: Tried to overwrite ${full_path}. Returning error.`.bold.red);
            return 'fatal';
        }

        var getBuffer = async (data) => {
            var bfrobj = Buffer.from(data, 'base64');
            var ft = await fileType.fromBuffer(bfrobj);
            try       { var audio_file_type = ft.ext;    }
            catch (e) { var audio_file_type = 'unknown'; }
            return {filebuffer: bfrobj, type: audio_file_type};
        }

        if (type_of_data == 'regular') {
            var audio_file = await getBuffer(data);
            if (!this.valid_types[type].includes(audio_file.type))
                return 'wrong file';
            fs.writeFileSync(full_path, audio_file.filebuffer);
        }

        /*
         *  [ {type: 'custom', title: '', art: '', base64: ''}, {type: 'song', id: 10} ]
         */
        else if (type_of_data == 'tracklist') {
            fs.mkdirSync(full_path);
            for (var file of data) {
                var audio_file = await getBuffer(file.base64);
                if (!this.valid_types[type].includes(audio_file.type)) {
                    fs.rmdir(full_path, {recursive: true});
                    return 'wrong file';
                }
                fs.writeFileSync(`${full_path}${path.sep}${file.filename}`, audio_file.filebuffer);
            }
        }

        return 'ok';

    }

    getRaw(filename, type) {
        try {
            return fs.readFileSync(this.path + type + path.sep + filename);
        } catch (err) {
            return false;
        }
    }

    get(filename, type) {
        var f = this.getRaw(filename, type);
        return f ? Buffer.from(f).toString('base64') : false;
    }

    delete(filename, type) {
        try {
            return fs.unlinkSync(this.path + type + path.sep + filename);
        } catch (e) {
            console.error(`cannot delete "${this.path + type + path.sep + filename}"`);
            console.error(e);
            return null;
        }
    }

}
