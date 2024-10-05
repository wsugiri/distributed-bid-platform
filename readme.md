# Distributed Bid Platform

A peer-to-peer auction solution built using Hyperswarm RPC and Hypercore technologies. This platform allows users to open auctions, place bids, and close auctions in a decentralized manner without a central server.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [How It Works](#how-it-works)
- [Usage](#usage)

## Features

- **Peer-to-Peer Auctions**: Open and manage auctions in a decentralized network.
- **Real-Time Bidding**: Users can place bids in real-time, with notifications sent to all participants.
- **Auction Management**: Creators can close auctions and declare winners.
- **No Central Server**: Utilizes a distributed hash table (DHT) for communication between nodes.

## Technologies Used

- **JavaScript**: Programming language used for the application.
- **Hyperswarm RPC**: For peer-to-peer communication.
- **Hypercore**: For distributed data storage.
- **Hyperbee**: For structured key-value storage.
- **Node.js**: Runtime environment for executing the JavaScript code.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/distributed-bid-platform.git
   cd distributed-bid-platform

2. Install the dependencies:
   ```bash
   npm install

### Running the Application

To start the auction server and client, use the following commands:
 - Start the server:
    ```bash
    npm start  
 - Start the client in a separate terminal:
    ```bash
    npm run client  

### How It Works
 - **Auction Creation**: Users can create auctions specifying the item and starting price. All clients are notified of the new auction via RPC.
 - **Bidding**: Participants can place bids on active auctions. The highest bid is updated and propagated to all nodes.
 - **Auction Closure**: When the auction is complete, the creator can close the auction, declaring the winner based on the highest bid.

### Usage
 - Open an Auction: A client can open an auction by providing the item and starting price.
 - Place a Bid: Clients can place bids on existing auctions, which will be validated and updated.
 - Close an Auction: The auction creator can close the auction, notifying all clients of the final results.