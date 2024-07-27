import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import forge from "./forge/client";
const readline = require('readline');
import prompt from "prompt-sync";
import { watch } from 'fs';


watch("./src/game.ts", async (event, filename) => {
  if (filename) {
    console.log(`${filename} changed. Rebuilding...`);
    await Bun.build({
      entrypoints: ["./src/game.ts"],
      outdir: "./public",
    });
    console.log("Rebuild complete.");
  }
});

// Build script.ts
await Bun.build({
  entrypoints: ["./src/game.ts"],
  outdir: "./public",
});
// change to server


const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Base resources
let baseResource: string[] = ['water', 'fire', 'earth', 'air'];

const getPrompt = (resource1, resource2) => `
What do you get when you combine ${resource1} and ${resource2}? 

Be creative, it should either be a fresh new element (preferred!) or one of the original elements.

Only return nouns.
`

const clean = (str) => {
  return str.replace(/[^a-zA-Z]/g, "").toLowerCase();
}

const cleanarr = (arr) => {
  return arr.map(clean);
}

baseResource = cleanarr(baseResource);

// Mock forge.craft.query function
async function mockCraftQuery(prompt: string): Promise<{ resource: string }> {
  // This is a mock implementation. Replace with actual API call.
  return { resource: `combined_${prompt.replace(' ', '_')}` };
}

// WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('craft', async (resources: string[]) => {
    if (resources.length < 2) {
      socket.emit('craftResult', { error: 'Please provide at least two resources.' });
      return;
    }

    const [resource1, resource2] = resources.map(clean);

    if (!baseResource.includes(resource1) || !baseResource.includes(resource2)) {
      socket.emit('craftResult', { error: `Please provide valid resources. The resources should be one of the following: ${baseResource.join(', ')}` });
      return;
    }

    try {
      console.log(`Crafting ${resource1} and ${resource2}...`);
      const data = await forge.craft.query(getPrompt(resource1, resource2));
      console.log(data);
      baseResource.push(clean(data.resource));
      socket.emit('craftResult', { success: true, data });
    } catch (error) {
      console.error(error);
      socket.emit('craftResult', { error: 'An error occurred while crafting.' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});