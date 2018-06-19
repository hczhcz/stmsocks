'use strict';

const url = require('url');

const httpParse = require('./http.parse');

const accept = (
    socket /*: net$Socket */
) /*: void */ => {
    let buffer = Buffer.alloc(0);
    let parseDone = false;

    const establish = () => {
        socket.emit('http.step', 'establish');

        socket.on('data', (chunk) => {
            socket.emit('httpclient.data', chunk);
        }).once('end', () => {
            socket.emit('httpclient.end');
        }).once('close', () => {
            socket.emit('httpclient.close');
        }).on('httpserver.data', (chunk) => {
            socket.write(chunk);
        }).once('httpserver.end', () => {
            socket.end();
        }).once('httpserver.close', () => {
            socket.destroy();
        });
    };

    const connect = (target, httpVersion) => {
        const address = url.parse('http://' + target);

        socket.emit(
            'httpclient.connect',
            address.hostname,
            parseInt(address.port, 10) || 80
        );

        socket.write(
            'HTTP/' + httpVersion
                + ' 200 Connection Established\r\n\r\n'
        );

        establish();
    };

    const request = (method, target, httpVersion, headers) => {
        const address = url.parse(target);

        socket.emit(
            'httpclient.request',
            address.hostname,
            parseInt(address.port, 10) || 80
        );

        socket.emit(
            'httpclient.data',
            Buffer.from(
                method
                    + ' ' + (address.pathname || '/')
                    + (address.search || '')
                    + (address.hash || '')
                    + ' HTTP/' + httpVersion + '\r\n'
            )
        );

        for (let i = 0; i < headers.length; i += 1) {
            socket.emit(
                'httpclient.data',
                Buffer.from(
                    headers[i][0] + ':' + headers[i][1] + '\r\n'
                )
            );

            for (let j = 2; j < headers[i].length; j += 1) {
                socket.emit(
                    'httpclient.data',
                    Buffer.from(
                        headers[i][j] + '\r\n'
                    )
                );
            }
        }

        socket.emit(
            'httpclient.data',
            Buffer.from(
                '\r\n'
            )
        );

        establish();
    };

    const handleHeader = (method, target, httpVersion) => {
        return httpParse.parseHeader(
            (headers) => {
                // next

                socket.emit('http.step', 'header');

                parseDone = true;

                // notice: how about 'OPTIONS' and 'TRACE'?
                if (method === 'CONNECT') {
                    connect(target, httpVersion);
                } else {
                    request(method, target, httpVersion, headers);
                }
            },
            () => {
                // parse error

                socket.emit('http.error', 'parse');
                socket.end();
            }
        );
    };

    const handleStartLine = () => {
        return httpParse.parseStartLine(
            (method, target, httpVersion) => {
                // next

                socket.emit('http.step', 'startline');

                return handleHeader(method, target, httpVersion);
            },
            () => {
                // parse error

                socket.emit('http.error', 'parse');
                socket.end();
            }
        );
    };

    const handler = handleStartLine();

    handler.next();

    socket.on('data', (chunk) => {
        if (!parseDone) {
            buffer = Buffer.concat([buffer, chunk]);

            while (true) {
                const index = buffer.indexOf('\r\n');

                if (index < 0) {
                    break;
                }

                handler.next(buffer.slice(0, index).toString());

                buffer = buffer.slice(index + 2);

                if (parseDone) {
                    socket.unshift(buffer);

                    break;
                }
            }
        }
    });
};

module.exports = {
    accept: accept,
};
