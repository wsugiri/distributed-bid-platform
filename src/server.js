const RPC = require('@hyperswarm/rpc');
const DHT = require('hyperdht');
const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const crypto = require('crypto');

const main = async () => {
    // setup hyperbee db
    const hcore = new Hypercore('./db/rpc-server');
    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' });
    await hbee.ready();

    // DHT setup
    let dhtSeed = (await hbee.get('dht-seed'))?.value;
    if (!dhtSeed) {
        // not found, generate and store in db
        dhtSeed = crypto.randomBytes(32);
        await hbee.put('dht-seed', dhtSeed);
    }

    // start distributed hash table, it is used for rpc service discovery
    const dht = new DHT({
        port: 40001,
        keyPair: DHT.keyPair(dhtSeed),
        bootstrap: [{ host: '127.0.0.1', port: 30001 }] // note boostrap points to dht that is started via cli
    });

    // resolve rpc server seed for key pair
    let rpcSeed = (await hbee.get('rpc-seed'))?.value;
    if (!rpcSeed) {
        rpcSeed = crypto.randomBytes(32);
        await hbee.put('rpc-seed', rpcSeed);
    }

    // RPC server setup
    const rpc = new RPC({ dht, seed: rpcSeed });
    const rpcServer = rpc.createServer();
    await rpcServer.listen();
    console.log('RPC server started, public key:', rpcServer.publicKey.toString('hex'));

    // bind handlers to rpc server
    rpcServer.respond('ping', async (reqRaw) => {
        // reqRaw is Buffer, we need to parse it
        const req = JSON.parse(reqRaw.toString('utf-8'));

        const resp = { nonce: req.nonce + 1 };

        // we also need to return buffer response
        const respRaw = Buffer.from(JSON.stringify(resp), 'utf-8');
        return respRaw;
    });
};

main().catch(console.error);