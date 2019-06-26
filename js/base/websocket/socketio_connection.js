"use strict";

const WebsocketBaseConnection = require ('./websocket_base_connection');
const WebSocket = require('ws');
const io = require('socket.io-client');

function convertSymbol (symbol) {
    return symbol.replace('-', '/').toUpperCase();
}

const { sleep } = require ('../functions')

module.exports = class WebsocketConnection extends WebsocketBaseConnection {
    constructor (options, timeout) {
        super();
        this.options = options;
        this.timeout = timeout;
        this.channels = [];
        this.client = {
            ws: null,
            isClosing: false,
        };
    }

    connect() {
        return new Promise ((resolve, reject) => {
            if ((this.client.ws != null) && (this.client.ws.readyState === this.client.ws.OPEN)) {
                resolve();
                return;
            }
            const client = {
                ws: null,
                isClosing: false,
            };
            client.ws = io(this.options.url);

            client.ws.on('connect', () => {
                // if (this.options['wait-after-connect']) {
                //     await sleep(this.options['wait-after-connect']);
                // }
                this.emit ('open');
                resolve();
            });

            client.ws.on('connect_error', (error) => {
                reject(error);
            });
        
            client.ws.on('disconnect', () => {
                if (!client.isClosing) {
                    this.emit('close');
                }
                reject('closing');
            });

            client.ws.on('error', (error) => {
                if (!client.isClosing) {
                    this.emit('close');
                }
                reject(error);
            });
        
            client.ws.on('orderbook', async (data) => {
                // if (this.options['verbose']){
                //     console.log("WebsocketConnection: "+data);
                // }
                if (!client.isClosing) {
                    let exchangeSymbol = data['symbol'] ? data['symbol'] : await Object.keys(data).filter(key => key.includes('-'))[0];
                    let symbol = await convertSymbol(exchangeSymbol);
                    if (this.channels.includes(`orderbook_${symbol}`)){
                        this.emit('message', JSON.stringify({
                            event: 'data',
                            channel: `orderbook_${symbol}`,
                            data: data[exchangeSymbol]
                        }));
                    }
                }
                resolve();
            });
            this.client = client;
        });
    }

    close () {
        if (this.client.ws != null) {
            this.client.isClosing = true;
            this.client.ws.close();
            this.client.ws = null;
        }
    }

    send (channel) {
        if (!this.client.isClosing) {
            this.channels.push(channel.channel);
        }
    }

    // send (data) {
    //     if (!this.client.isClosing) {
    //         this.client.ws.send (data);
    //     }
    // }

    isActive() {
        if (this.client.ws == null){
            return false;
        }
        return (this.client.ws.readyState == this.client.ws.OPEN) || 
            (this.client.ws.readyState == this.client.ws.CONNECTING);
    }
};