'use strict';

const getAddressHeader = (
    task /*: Socks5Task */
) /*: Buffer */ => {
    switch (task.addressType) {
        case 'ipv4':
            return Buffer.from([
                0x01,
            ]);
        case 'domainname':
            return Buffer.from([
                0x03,
                task.address.length,
            ]);
        case 'ipv6':
            return Buffer.from([
                0x04,
            ]);
        default:
            // never reach
            throw Error();
    }
};

const writeAuth = (
    socket /*: net$Socket */,
    method /*: number */
) /*: void */ => {
    // version: 5
    // method

    socket.write(Buffer.from([
        0x05,
        method,
    ]));
};

const writeReply = (
    socket /*: net$Socket */,
    task /*: Socks5Task */
) /*: void */ => {
    // version: 5
    // reply: succeeded
    // reserved
    // address type
    // address
    // port

    socket.write(Buffer.concat([
        Buffer.from([
            0x05,
            0x00,
            0x00,
        ]),
        getAddressHeader(task),
        task.address,
        Buffer.from([
            task.port >>> 8, task.port & 0xff,
        ]),
    ]));
};

const writeError = (
    socket /*: net$Socket */,
    reply /*: number */
) /*: void */ => {
    // version: 5
    // reply
    // reserved
    // address type: ipv4
    // address: 0.0.0.0
    // port: 0

    socket.write(Buffer.from([
        0x05,
        reply,
        0x00,
        0x01,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00,
    ]));
};

const writeErrorTCP = (
    socket /*: net$Socket */,
    code /*: string */
) /*: void */ => {
    switch (code) {
        case 'ENETUNREACH':
            // reply: network unreachable
            writeError(socket, 0x03);

            break;
        case 'EHOSTUNREACH':
            // reply: host unreachable
            writeError(socket, 0x04);

            break;
        case 'ECONNREFUSED':
            // reply: connection refused
            writeError(socket, 0x05);

            break;
        default:
            // reply: general socks server failure
            writeError(socket, 0x01);
    }
};

const writeUDP = (
    socket /*: dgram$Socket */,
    address /*: string */,
    port /*: number */,
    task /*: Socks5Task */,
    msg /*: Buffer */
) /*: void */ => {
    // reserved
    // fragment: 0
    // address type
    // address
    // port
    // data

    socket.send(
        Buffer.concat([
            Buffer.from([
                0x00, 0x00,
                0x00,
            ]),
            getAddressHeader(task),
            task.address,
            Buffer.from([
                task.port >>> 8, task.port & 0xff,
            ]),
            msg,
        ]),
        port,
        address
    );
};

module.exports = {
    writeAuth: writeAuth,
    writeReply: writeReply,
    writeError: writeError,
    writeErrorTCP: writeErrorTCP,
    writeUDP: writeUDP,
};
