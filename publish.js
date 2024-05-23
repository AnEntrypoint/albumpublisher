require('dotenv').config()
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const { JsonRpcProvider } = require('@ethersproject/providers');
const Irys = require('@irys/sdk');
const mime = require('mime-types');
const { env } = require('process');
const polygonRpcUrl = 'https://polygon-rpc.com';
const provider = new JsonRpcProvider(polygonRpcUrl);
const wallet = new ethers.Wallet(process.env.PK, provider);

const getIrys = async () => {
  const network = "mainnet";
  const token = "matic";
  const irys = new Irys({
    network,
    token,
    key: wallet.privateKey,
    config: { providerUrl: polygonRpcUrl },
  });
  return irys;
};
async function calculateAndFundIfNeeded(irys, fileSizes) {
  const totalSizeInBytes = fileSizes.reduce((acc, size) => acc + size, 0);
  const estimatedCost = BigInt(await irys.getPrice(totalSizeInBytes));
  const balance = BigInt(await irys.getBalance(wallet.address));
  const neededFunding = estimatedCost > balance ? estimatedCost - balance : 0n;
  if (neededFunding > 0) {
    console.log(`Funding needed: ${irys.utils.fromAtomic(neededFunding.toString())} ${irys.token}`);
    await irys.fund(neededFunding.toString()); // Ensure correct type for funding
    console.log(`Successfully funded: ${irys.utils.fromAtomic(neededFunding.toString())} ${irys.token}`);
  } else {
    console.log("Current balance is sufficient, no funding needed.");
  }
}
async function uploadToIrys(filePath) {
  const irys = await getIrys();
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';
  const receipt = await irys.uploadFile(filePath, { tags: [{ name: 'Content-Type', value: mimeType }] });
  console.log(`File uploaded ==> https://gateway.irys.xyz/${receipt.id}`);
  return `https://gateway.irys.xyz/${receipt.id}`;
}
async function createPlaylistJson(folder) {
  const files = fs.readdirSync(folder);
  const fileSizes = files.map(file => fs.statSync(path.join(folder, file)).size);
  const irys = await getIrys();
  await calculateAndFundIfNeeded(irys, fileSizes);
  const playlist = {
    schemaVersion: '1',
    coverArtUrl: '',
    title: '',
    artist: '',
    bio: '',
    chain: 'Polygon',
    contractAddress: '0x319defee6cc58b52b2fa25c6fd9c799806e59ccc',
    tokenId: '1',
    tokenType: 'ERC-721',
    hideBranding: false,
    items: [],
  };
  if (files.includes('coverart.jpg')) {
    playlist.coverArtUrl = await uploadToIrys(path.join(folder, 'coverart.jpg'));
  }
  if (files.includes('title.txt')) {
    playlist.title = fs.readFileSync(path.join(folder, 'title.txt'), 'utf-8').trim();
  }
  if (files.includes('artist.txt')) {
    playlist.artist = fs.readFileSync(path.join(folder, 'artist.txt'), 'utf-8').trim();
  }
  if (files.includes('bio.txt')) {
    playlist.bio = fs.readFileSync(path.join(folder, 'bio.txt'), 'utf-8').trim();
  }
  if (files.includes('links.txt')) {
    playlist.links = fs.readFileSync(path.join(folder, 'links.txt'), 'utf-8').trim()
  }
  const trackFiles = files.filter(file => file.startsWith('track') && file.endsWith('.mp3'));
  for (const trackFile of trackFiles) {
    const trackNumber = trackFile.match(/\d+/)[0];
    const item = {
      kind: 'audio',
      title: trackFile.replace('.mp3', ''),
      artist: playlist.artist,
      url: await uploadToIrys(path.join(folder, trackFile)),
    };
    const imageFile = `image${trackNumber}.jpg`;
    if (files.includes(imageFile)) {
      item.imageUrl = await uploadToIrys(path.join(folder, imageFile));
    }
    const bioFile = `bio${trackNumber}.txt`;
    if (files.includes(bioFile)) {
      item.bio = fs.readFileSync(path.join(folder, bioFile), 'utf-8').trim();
    }
    playlist.items.push(item);
  }
  const playlistJsonPath = 'playlist.json';
  fs.writeFileSync(playlistJsonPath, JSON.stringify(playlist, null, 2));
  const indexHtmlPath = path.join(folder, 'index.html');
  const indexUrl = await uploadToIrys(indexHtmlPath);
  return { playlistUrl: await uploadToIrys(playlistJsonPath), indexUrl };
}

async function createMetaJson(folder, playlistUrl, indexUrl) {
  const playlistContent = fs.readFileSync(path.join(folder, 'playlist.json'), 'utf-8');
  const playlist = JSON.parse(playlistContent);
  const ipfsHash = playlistUrl.split('/').pop();
  const meta = {
    title: playlist.title,
    type: 'object',
    url: playlist.coverArtUrl,
    description: playlist.bio+"\n "+`${indexUrl}#${ipfsHash}`,
    minter_name:process.env.MINTERNAME,
    animation_url: `${indexUrl}#${ipfsHash}`,
    animation_detail: { format: 'HTML' },
    playlist_metadata: playlistUrl,
    properties: {
      name: {
        type: 'string',
        description: playlist.title,
      },
      description: {
        type: 'string',
        description: playlist.bio+"\n "+`${indexUrl}#${ipfsHash}`,
      },
      image: {
        type: 'string',
        description: playlist.coverArtUrl,
      },
    },
  };
  const metaJsonPath = 'meta.json';
  fs.writeFileSync(metaJsonPath, JSON.stringify(meta, null, 2));
  return uploadToIrys(metaJsonPath);
}
const publish = async () => {
  const folder = './playlist';
  const out = []
  try {
    const { playlistUrl, indexUrl } = await createPlaylistJson(folder);
    out.push(`Playlist URL: ${playlistUrl}`);
    out.push(`Index URL: ${indexUrl}`);
    const metaUrl = await createMetaJson(folder, playlistUrl, indexUrl);
    out.push(`Meta URL: ${metaUrl}`);
  } catch (error) {
    out.push("Error:", error);
  }
  return out.join('<br>')
}
module.exports.publish = publish