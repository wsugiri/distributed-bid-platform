const RPC = require('@hyperswarm/rpc');
const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const crypto = require('crypto');
const fs = require('fs');

const auctions = {}; // Store active auctions

const main = async () => {
    // setup hyperbee db
    const hcore = new Hypercore('./db/rpc-server');
    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' });
    await hbee.ready();

    // DHT setup
    let dhtSeed = (await hbee.get('dht-seed'))?.value;
    if (!dhtSeed) {
        dhtSeed = crypto.randomBytes(32);
        await hbee.put('dht-seed', dhtSeed);
    }

    // resolve rpc server seed for key pair
    let rpcSeed = (await hbee.get('rpc-seed'))?.value;
    if (!rpcSeed) {
        rpcSeed = crypto.randomBytes(32);
        await hbee.put('rpc-seed', rpcSeed);
    }

    // RPC server setup
    const rpc = new RPC({ seed: rpcSeed });
    const rpcServer = rpc.createServer();
    await rpcServer.listen();

    const publicKey = rpcServer.publicKey.toString('hex');
    console.log('RPC server started, public key:', publicKey);
    fs.writeFileSync('publickey', publicKey, 'utf-8');

    // bind handlers to rpc server
    rpcServer.respond('ping', async (reqRaw) => {
        const req = JSON.parse(reqRaw.toString('utf-8'));
        const resp = { nonce: req.nonce + 1 };

        console.log(`ping from client`, resp);

        // we also need to return buffer response
        return Buffer.from(JSON.stringify(resp), 'utf-8');
    });

    rpcServer.respond('createAuction', async (reqRaw) => {
        const req = JSON.parse(reqRaw.toString('utf-8'));
        const auctionId = crypto.randomBytes(16).toString('hex'); // Generate unique auction ID

        // Store the auction
        auctions[auctionId] = {
            item: req.item,
            startingPrice: req.startingPrice,
            bids: [],
            highestBid: null,
            highestBidder: null,
            status: 'open'
        };

        // store data auctions
        await hbee.put('auctions', Buffer.from(JSON.stringify(auctions)));
        console.log(`Auction created: ${auctionId} for item ${req.item} at ${req.startingPrice} USDt`);

        return Buffer.from(JSON.stringify({ auctionId, data: auctions[auctionId] }), 'utf-8'); // Return auction ID & data
    });

    rpcServer.respond('placeBid', async (reqRaw) => {
        const req = JSON.parse(reqRaw.toString('utf-8'));
        const auction = auctions[req.auctionId];

        if (!auction || auction.status !== 'open') {
            return Buffer.from(JSON.stringify({ message: 'Auction is not available.' }), 'utf-8');
        }

        if (req.bidAmount <= (auction.highestBid || auction.startingPrice)) {
            console.log(`Rejected bid ${req.bidAmount} from ${req.bidder}, Bid must be higher than the current highest bid.`);
            return Buffer.from(JSON.stringify({ message: 'Bid must be higher than the current highest bid.' }), 'utf-8');
        }

        // Update highest bid
        auction.highestBid = req.bidAmount;
        auction.highestBidder = req.bidder;
        auction.bids.push({ bidder: req.bidder, amount: req.bidAmount });

        console.log(`Bid placed on auction ${req.auctionId} by ${req.bidder} for ${req.bidAmount} USDt`);

        return Buffer.from(JSON.stringify({ message: 'Bid placed successfully.' }), 'utf-8');
    });

    rpcServer.respond('closeAuction', async (reqRaw) => {
        const req = JSON.parse(reqRaw.toString('utf-8'));
        const auction = auctions[req.auctionId];

        if (!auction || auction.status !== 'open') {
            throw new Error('Auction is not open or does not exist.');
        }

        // Mark auction as closed
        auction.status = 'closed';
        console.log(`Auction ${req.auctionId} closed`);
        console.log(`Winner for ${auction.item} by ${auction.highestBidder} at ${auction.highestBid} USDt`);

        return Buffer.from(JSON.stringify({ message: `Auction ${auction.item} closed`, winner: auction.highestBidder, amount: auction.highestBid }), 'utf-8');
    });
};

main().catch(console.error);