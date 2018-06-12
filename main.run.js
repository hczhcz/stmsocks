'use strict';

const config = require('./config');

const runMode = (
    mode /*: string */,
    args /*: any */
) /*: void */ => {
    console.log('mode ' + mode);

    const configList = config.modes[mode];
    const passList = [];

    for (let i = 1; i < configList.length; i += 1) {
        const argList = [];

        for (let j = 1; j < configList[i].length; j += 1) {
            if (typeof configList[i][j] === 'string' && configList[i][j][0] === '-') {
                if (args[configList[i][j]]) {
                    console.log('arg ' + configList[i][j] + ' ' + args[configList[i][j]]);

                    argList.push(args[configList[i][j]]);
                } else {
                    console.error('missing arg ' + configList[i][j]);

                    return;
                }
            } else {
                argList.push(configList[i][j]);
            }
        }

        passList.push(require('./pass.' + configList[i][0])(...argList));
    }

    passList.push(passList[0]);

    for (let k = 1; k < passList.length; k += 1) {
        passList[k - 1].next = passList[k].open;
    }
};

module.exports = {
    runMode: runMode,
};
