import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import forge from "./forge/client";
const readline = require('readline');
import prompt from "prompt-sync";
import { existsSync, watch } from 'fs';
import mime from 'mime-types';
import type { Resource } from "./forge/schema/craft";


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

const filePath = path.join(__dirname, 'public', 'game.js');
if (existsSync(filePath)) {
  console.log("File exists");
  const contentType = mime.lookup(filePath);
  console.log("Content-Type:", contentType);
} else {
  console.log("File does not exist");
}


const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/public/game.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'game.js'));
});


const fire: Resource = {
  name: 'fire',
  color: '#e74c3c',
  emoji: '🔥',
  product: null,
  recipe: null,
}

// "base resource" (it has no recipe, it is given by the game)
const iron: Resource = {
  name: 'fire',
  color: '#e74c3c',
  emoji: '⛏️',
  product: null,
  recipe: null,
}

// Base resources
let resourceLibrary: Record<string, Resource> = {
  "fire": fire,
  "iron": iron,
}



// get prompt takes two resourcenames
const getPrompt = (resource1name: string, resource2name: string) => `
What do you get when you combine ${resource1name} and ${resource2name}? 

Be creative, it should either be a fresh new element (preferred!) or one of the existing elements.

Here are all the existing elements:
${Object.keys(resourceLibrary).join('\n')}

Only return nouns.
`

const cleanName = (str: string) => str.replace(/[^a-zA-Z]/g, "").toLowerCase();

const clean = (resource: Resource): Resource => {
  return {
    name: cleanName(resource.name),
    color: resource.color,
    emoji: resource.emoji,
    product: resource.product ? cleanName(resource.product) : null,
    recipe: resource.recipe ? resource.recipe.map(cleanName) as [string, string] : null
  };
}

// WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('craft', async (resources: [Resource, Resource]) => {
    if (resources.length < 2) {
      socket.emit('craftResult', { error: 'Please provide at least two resources.' });
      return;
    }

    const [resource1, resource2] = resources.map(clean);

    if (!Object.keys(resourceLibrary).includes(resource1.name) || !Object.keys(resourceLibrary).includes(resource2.name)) {
      socket.emit('craftResult', { error: `Please provide valid resources. The resources should be one of the following: ${Object.keys(resourceLibrary).join(', ')}` });
      return;
    }

    try {
      console.log(`Crafting ${resource1} and ${resource2}...`);
      // query1: create a new resource NAME

      // query2: given this name, what is the recipe? and what does it produce?
      let forgeResult = await forge.craft.query(getPrompt(resource1.name, resource2.name));
      // if the product has a name and the name isn't in resourceLibrary.keys, add it to resourceLibrary
      if (forgeResult.product && !Object.keys(resourceLibrary).includes(forgeResult.product)) {
        // make it via forge
        const retryCreation = await forge.craft.query("ERROR - INVALID SCHEMA (data.product does not exist in resource library): " + JSON.stringify(forgeResult) + "\n\n Please try again with " + getPrompt(resource1.name, resource2.name) + "\n\n try again, but this time please MAKE SURE the product already exists in the resource library");

        if (retryCreation.product && !Object.keys(resourceLibrary).includes(retryCreation.product)) {
          const resourceKeys = Object.keys(resourceLibrary);
          const randomResource = resourceLibrary[resourceKeys[Math.floor(Math.random() * resourceKeys.length)]];
          retryCreation.product = randomResource.name;
        }
        forgeResult = retryCreation;
      }

      let data: Resource = { ...forgeResult, recipe: [resource1.name, resource2.name] }
      console.log("FORGE INITIAL DATA: ", data)
      console.log(data);
      const cleanedData = clean(data)
      resourceLibrary[cleanedData.name] = cleanedData
      socket.emit('craftResult', { success: true, data: cleanedData });
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