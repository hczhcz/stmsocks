'use strict';

const crypto = require('crypto');
const net = require('net');

const config = require('./config');
const serialize = require('./serialize');
const httpAgent = require('./http.agent');

module.exports = (
    listenPort /*: number */
) /*: Pass */ => {
    const self = {
        next: null,

        open: (info, callback) => {
            callback((data) => {
                // send

                const json = serialize.getJson(data);
                const chunk = serialize.getChunk(data);

                switch (json[0]) {
                    case 'data':
                        info.socket.emit('httpserver.data', chunk);

                        break;
                    case 'end':
                        info.socket.emit('httpserver.end');

                        break;
                    default:
                        // ignore
                }
            }, () => {
                // close

                info.socket.emit('httpserver.close');
            });
        },
    };

    net.createServer({
        allowHalfOpen: true,
    }).on('connection', (socket) => {
        socket.pause();

        const id = crypto.randomBytes(2).toString('hex');
        const info = {
            socket: socket,
        };

        if (!self.next) {
            // non-null assertion

            throw Error();
        }

        self.next(info, (send, close) => {
            const sendJson = (json, chunk) => {
                send(serialize.create(json, chunk));
            };

            httpAgent.accept(socket);

            socket.on('error', (err) => {
                console.error(id + ' tcp error');

                if (config.log.network) {
                    console.error(err);
                }
            }).once('httpclient.request', (address, port) => {
                console.log(id + ' http request ' + address + ' ' + port);

                sendJson(['connect', address, port], null);
            }).once('httpclient.connect', (address, port) => {
                console.log(id + ' http connect ' + address + ' ' + port);

                sendJson(['connect', address, port], null);
            }).on('httpclient.data', (chunk) => {
                if (config.log.transfer) {
                    console.error(id + ' http data');
                }

                sendJson(['data'], chunk);
            }).on('httpclient.end', () => {
                if (config.log.transfer) {
                    console.error(id + ' http end');
                }

                sendJson(['end'], null);
            }).on('httpclient.close', () => {
                if (config.log.transfer) {
                    console.error(id + ' http close');
                }

                close();
            }).on('http.step', (step) => {
                if (config.log.step) {
                    console.error(id + ' http step ' + step);
                }
            }).on('http.error', (step) => {
                console.error(id + ' http error ' + step);
            }).resume();
        });
    }).on('error', (err) => {
        console.error('tcp server error');

        if (config.log.network) {
            console.error(err);
        }
    }).listen(listenPort);

    return self;
};
