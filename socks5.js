'use strict';

const socks5parse = require('./socks5.parse');
const socks5write = require('./socks5.write');

const accept = (socket, connect, bind, udpAssociate) => {
    const handleClose = () => {
        socket.end();

        return function *() {
            // nothing
        };
    };

    const handleRequest = () => {
        return socks5parse.parseRequest(
            socket,
            (task) => {
                // next

                switch (task.command) {
                    case 'connect':
                        return connect(
                            task.addressType, task.address, task.port,
                            (addressType, address, port) => {
                                // connect

                                socks5write.writeReply(socket, addressType, address, port);
                            },
                            (code) => {
                                // error

                                socks5write.writeErrorTCP(socket, code);
                            }
                        );
                    case 'bind':
                        return bind(
                            task.addressType, task.address, task.port,
                            (addressType, address, port) => {
                                // bind

                                socks5write.writeReply(socket, addressType, address, port);
                            },
                            (addressType, address, port) => {
                                // connect

                                socks5write.writeReply(socket, addressType, address, port);
                            },
                            (code) => {
                                // error

                                socks5write.writeErrorTCP(socket, code);
                            }
                        );
                    case 'udpassociate':
                        return udpAssociate(
                            task.addressType, task.address, task.port,
                            (addressType, address, port) => {
                                // udp associate

                                socks5write.writeReply(socket, addressType, address, port);
                            },
                            (code) => {
                                // error

                                socks5write.writeErrorTCP(socket, code);
                            }
                        );
                    default:
                        // never reach
                        throw Error();
                }
            },
            () => {
                // command error

                // reply: command not supported
                socks5write.writeError(socket, 0x07);

                return handleClose(socket);
            },
            () => {
                // address error

                // reply: address type not supported
                socks5write.writeError(socket, 0x08);

                return handleClose(socket);
            },
            () => {
                // parse error

                return handleClose(socket);
            }
        );
    };

    const handleAuth = () => {
        return socks5parse.parseAuth(
            socket,
            () => {
                // next

                // method: no authentication required
                socks5write.writeAuth(socket, 0x00);

                return handleRequest(socket);
            },
            () => {
                // auth error

                // method: no acceptable methods
                socks5write.writeAuth(socket, 0xFF);

                return handleClose(socket);
            },
            () => {
                // parse error

                return handleClose(socket);
            }
        );
    };

    const handler = handleAuth(socket);

    handler.next();

    return handler;
};

module.exports = {
    accept: accept,
};
