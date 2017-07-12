//@flow

import SerialPort from 'serialport';

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

export function canSendLine() {
    return sentLines <= maxSentLines;
}

function incrementLineNum() {
    // Wrap line numbers if needed
    curLineNum++;
    if (curLineNum > 100000)
        resetLineNum();
}

// Synchronously sends line as soon as there is room
export function sendLine(line: string) {
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

    sentLines++;
    if (sentLines >= maxSentLines) {
        return new Promise((resolve, reject) => {
            sentLineMap.set(curLineNum, {
                line,
                resolve,
                reject
            });

            incrementLineNum();
        });
    }
    else {
        incrementLineNum();

        return undefined;
    }
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
        if (line)
            resolve = line.resolve;

        sentLineMap.delete(ln);
        if (resolve)
            resolve();
    }
}
