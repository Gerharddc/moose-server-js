import * as fs from "fs";

export const rootPath = "/home/printer/";

export function listFiles(): string[] {
    const files: string[] = [];
    fs.readdirSync(rootPath).forEach((file) => {
        files.push(file);
    });

    return files;
}

export function saveUploadedFile(file: Express.File) {
    file.mv(rootPath + file.name, (err) => {
        if (err) {
            throw new Error(err);
        }
    });
}

export async function deleteFile(path: string) {
    await fs.unlink(path);
}
