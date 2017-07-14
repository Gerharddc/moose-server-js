//@flow

import SerialPort from 'serialport';
import LineByLineReader from 'line-by-line';
import { rootPath } from './files';

process.on('message', msg => {
   switch (msg.action) {
       case 'sendCode':
           sendCode(msg.code);
           break;
       case 'sendLine':
           sendLine(msg.line, msg.promise, msg.reject, true);
           break;
       case 'resetLineNum':
           resetLineNum();
           break;
       case 'checkRoomForLines':
           checkRoomForLines();
           break;
       case 'sendFile':
           sendFile(msg.filePath);
           break;
   }
});

let port = null;
try {
    port = new SerialPort('/dev/ttyS0', {
        baudRate: 57600
    });

    port.on('error', err => {
        console.log('SerialPort-error: ' + err)
    });

    port.on('readable', () => {
        if (port !== null)
            handleSerialResponse(port.read());
    })
}
catch (e) {
    console.log('SerialPort-error: ' + e.message)
}

export function sendCode(code: string) {
    if (port === null)
        throw new Error('Printer serial port not open for reading');

    port.write(code);
}

let curLineNum = 1;

export function resetLineNum(): void {
    sendCode('M110 N0');
    curLineNum = 0;
}

let sentLineMap = new Map();
let sentLines = 0;
const maxSentLines = 20;

function incrementLineNum() {
    // Wrap line numbers if needed
    curLineNum++;
    if (curLineNum > 100000)
        resetLineNum();
}

function checkRoomForLines() {
    process.send({
        type: 'roomForLines',
        roomForLines: sentLines < maxSentLines
    })
}

// Synchronously sends line as soon as there is room
function sendLine(line: string, resolve, reject, externalResolve = false) {
    if (port === null)
        throw new Error('Printer serial port not open for reading');

    // Remove comments
    line = line.split(';')[0];
    line = 'N' + curLineNum + ' ' + line + ' *';

    // Add checksum
    let cs = 0;
    for (let i = 0; line[i] !== '*' && line[i] !== null; i++)
        cs = cs ^ line.charCodeAt(i);
    cs &= 0xff;
    line += cs;

    sendCode(line);

    sentLineMap.set(curLineNum, {
        line,
        resolve,
        reject,
        externalResolve
    });

    sentLines++;
    incrementLineNum();
    checkRoomForLines();
}

function sendLinePromise(line: string) {
    return new Promise((resolve, reject) => {
        sendLine(line, resolve, reject);
    });
}

function handleSerialResponse(resp: string): void {
    // TODO

    if (resp.includes('rs')) {
        let ln: number = Number(resp.split(' '[1]));
        sendCode(String(sentLineMap.get(ln)));
    }
    else if (resp.includes('ok')) {
        let ln: number = Number(resp.split(' '[1]));
        sentLines--;
        let line = sentLineMap.get(ln);
        let resolve;
        let externalResolve;
        if (line) {
            resolve = line.resolve;
            externalResolve = line.externalResolve;
        }

        sentLineMap.delete(ln);
        if (resolve) {
            if (externalResolve) {
                process.send({
                    type: 'callResolve',
                    resolve
                });
            }
            else
                resolve();
        }
    }
}

function sendFile(filePath: string) {
    let lineReader = new LineByLineReader(rootPath + filePath);

    lineReader.on('line', line => {
        lineReader.pause();

        let res = sendLinePromise(line);
        if (res instanceof Promise)
            res.then(m => lineReader.resume());
        else
            lineReader.resume();
    });

    lineReader.on('error', err => {
        // TODO
        console.log('Linereader error: ' + err);
    });

    lineReader.on('end', () => {
        // TODO: notify done with file
    });
}