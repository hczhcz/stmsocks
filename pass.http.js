'use strict';

const crypto = require('crypto');
const net = require('net');

const config = require('./config');
const serialize = require('./serialize');
const http = require('./http');

module.exports = (
    nextPass /*: Pass */,
    listenPort /*: number */
) /*: Pass */ => {
    net.createServer({
        allowHalfOpen: true,
    }).on('connection', (socket) => {
        const info = {
            id: crypto.randomBytes(2).toString('hex'),
            socket: socket,
        };

        const next = nextPass(info);

        const sendJson = (json, chunk) => {
            next.next(serialize.create(json, chunk));
        };

        next.next();

        http.accept(socket);

        socket.on('error', (err) => {
            console.error(info.id + ' tcp error');

            if (config.log.network) {
                console.error(err);
            }
        }).once('httpclient.request', (address, port) => {
            console.log(info.id + ' http request ' + address + ' ' + port);

            sendJson(['connect', address, port], null);
        }).once('httpclient.connect', (address, port) => {
            console.log(info.id + ' http connect ' + address + ' ' + port);

            sendJson(['connect', address, port], null);
        }).on('httpclient.data', (chunk) => {
            if (config.log.transfer) {
                console.error(info.id + ' http data');
            }

            sendJson(['data'], chunk);
        }).once('httpclient.end', () => {
            if (config.log.transfer) {
                console.error(info.id + ' http end');
            }

            sendJson(['end'], null);
        }).once('httpclient.close', () => {
            if (config.log.transfer) {
                console.error(info.id + ' http close');
            }

            next.next(null);
        }).on('http.step', (step) => {
            if (config.log.step) {
                console.error(info.id + ' http step ' + step);
            }
        }).on('http.error', (step) => {
            console.error(info.id + ' http error ' + step);
        });
    }).on('error', (err) => {
        console.error('tcp server error');

        if (config.log.network) {
            console.error(err);
        }
    }).listen(listenPort);

    return function *(info) {
        if (!info.socket) {
            // non-null assertion

            throw Error();
        }

        const socket = info.socket;

        // TODO: 2-stage

        for (let data = yield; data !== null; data = yield) {
            const json = serialize.getJson(data);
            const chunk = serialize.getChunk(data);

            switch (json[0]) {
                case 'data':
                    socket.emit('httpserver.data', chunk);

                    break;
                case 'end':
                    socket.emit('httpserver.end');

                    break;
                default:
                    // ignore
            }
        }

        socket.emit('httpserver.close');
    };
};
