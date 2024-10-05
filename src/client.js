'use strict';

const RPC = require('@hyperswarm/rpc');
const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const crypto = require('crypto');
const fs = require('fs');

const main = async () => {
    // Setup Hyperbee database for client
    const hcore = new Hypercore('./db/rpc-client');
    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' });
    await hbee.ready();

    // DHT setup
    let dhtSeed = (await hbee.get('dht-seed'))?.value;
    if (!dhtSeed) {
        dhtSeed = crypto.randomBytes(32);
        await hbee.put('dht-seed', dhtSeed);
    }

    const rpc = new RPC({ seed: dhtSeed });

    let SERVER_PUBLIC_KEY = process.argv[2];
    if (fs.existsSync('publickey')) {
        SERVER_PUBLIC_KEY = fs.readFileSync('publickey', 'utf-8');
    }

    // Create an auction
    const createAuction = async (item, startingPrice) => {
        const payload = { item, startingPrice };
        const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8');
        const serverPubKey = Buffer.from(SERVER_PUBLIC_KEY, 'hex');

        const auctionIdRaw = await rpc.request(serverPubKey, 'createAuction', payloadRaw);
        const auctionId = JSON.parse(auctionIdRaw.toString('utf-8')).auctionId;
        console.log(`Auction created: ${auctionId}`);
        return auctionId;
    };

    // Place a bid
    const placeBid = async (auctionId, bidder, bidAmount) => {
        const payload = { auctionId, bidder, bidAmount };
        const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8');
        const serverPubKey = Buffer.from(SERVER_PUBLIC_KEY, 'hex');

        await rpc.request(serverPubKey, 'placeBid', payloadRaw);
        console.log(`Bid of ${bidAmount} USDt placed on auction ${auctionId} by ${bidder}`);
    };

    // Close an auction
    const closeAuction = async (auctionId) => {
        const payload = { auctionId };
        const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8');
        const serverPubKey = Buffer.from(SERVER_PUBLIC_KEY, 'hex');

        const responseRaw = await rpc.request(serverPubKey, 'closeAuction', payloadRaw);
        const response = JSON.parse(responseRaw.toString('utf-8'));
        console.log(`${response.message}. winner: ${response.winner} at ${response.amount} USDt`);
    };

    // running scenario bid
    const auctionId1 = await createAuction('Pic#1', 75);  // Create an auction1
    const auctionId2 = await createAuction('Pic#2', 60);  // Create an auction2

    await placeBid(auctionId1, 'Client#2', 75);           // Place a bid
    await placeBid(auctionId1, 'Client#3', 75.5);         // Place another bid
    await placeBid(auctionId1, 'Client#2', 80);           // Place another bid
    await placeBid(auctionId2, 'Client#2', 70);           // Place a bid
    await placeBid(auctionId2, 'Client#4', 90);           // Place a bid

    await closeAuction(auctionId1);                       // Close the auction1
    await closeAuction(auctionId2);                       // Close the auction2

    await rpc.destroy();
};

main().catch(console.error);
