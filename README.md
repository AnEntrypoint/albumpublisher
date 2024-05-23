To use this:

Generate a new paper wallet, this will serve as the wallet that publishes to arweave

This project can do that:
https://cryptodapprun.github.io/Cryptocurrency-Paper-Wallet-Generator/

Keep the private key and public key save

put the priavte key in the PK= part of .env

run:

npm install
node server.js

then access it at http://localhost:3000
and edit the album details

when you're happy with it click publish
copy the metadata url

go to the minting page, make sure you have frame.sh or metamask ready before you do
allow it to interact with your wallet
deploy a contract, keep the contract address recorded somewhere for future mints

then mint a token, setting its address to the uri you were provided earlier
