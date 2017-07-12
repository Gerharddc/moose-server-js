// @ flow

import fs from 'fs';
export const rootPath = '/home/printer/';

export function listFiles(): Array<string> {
    let _files = [];
    fs.readdirSync(rootPath).forEach(file => {
        _files.append(file);
    });

    return _files;
}

export function saveUploadedFile(file): void {
    file.mv(rootPath + file.name, (err) => {
        if (err)
            throw new Error(err);
    })
}
