'use strict';

const net = require('net');

module.exports = (port) => {
    const self = {
        next: null,

        open: (info, callback) => {
            callback((data) => {
                // send

                info.socket.write(data);
            }, () => {
                // close

                info.socket.destroy();
            });
        },
    };

    net.createServer({
        allowHalfOpen: true,
    }).on('connection', (socket) => {
        socket.pause();

        const info = {
            socket: socket,
        };

        self.next(info, (send, close) => {
            socket.on('data', (chunk) => {
                send(chunk);
            }).on('close', () => {
                close();
            }).resume();
        });
    }).listen(port);

    return self;
};
