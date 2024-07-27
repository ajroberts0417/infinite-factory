import { io, Socket } from "socket.io-client";

const socket: Socket = io();
const palette = document.getElementById('palette') as HTMLElement;
const canvas = document.getElementById('canvas') as HTMLElement;
const resultDiv = document.getElementById('result') as HTMLElement;



type Resource = {
  name: string;
  color: string;
  emoji: string;
  product: Resource | null;
  recipe: Resource[] | null; // this must exist in the canvas for the factory to produce the "produces" resource
}

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

// intermediate resource (it has a recipe, but no product)
const gear: Resource = {
  name: 'gear',
  color: '#fff',
  emoji: '⚙️',
  product: null,
  recipe: [fire, iron],
}

// factory resurces (it has a product, AND a recipe)
const ironFactory: Resource = {
  name: 'iron factory',
  color: '#fff',
  emoji: '🔩',
  product: iron,
  recipe: [gear, gear],
}

const gearFactory: Resource = {
  name: 'gear factory',
  color: '#fff',
  emoji: '🏭',
  product: gear,
  recipe: [ironFactory, ironFactory],
}

// 1. add a production rate
const PRODUCTION_RATE = 10;



let baseResources: string[] = ['water', 'fire', 'earth', 'air'];
let canvasResources: any[] = [];

function createResourceElement(resource: string): HTMLElement {
  const elem = document.createElement('div');
  elem.className = 'resource';
  elem.textContent = resource;
  elem.draggable = true;
  elem.dataset.element = resource;
  elem.addEventListener('dragstart', drag);
  
  // Add a loading circle
  const loadingCircle = document.createElement('div');
  loadingCircle.className = 'loading-circle';
  elem.appendChild(loadingCircle);
  
  return elem;
}

function updatePalette(): void {
  palette.innerHTML = '';
  baseResources.forEach(resource => {
    palette.appendChild(createResourceElement(resource));
  });
}

function drag(event: DragEvent): void {
  if (event.dataTransfer && event.target instanceof HTMLElement) {
    event.dataTransfer.setData("text/plain", event.target.dataset.element || "");
  }
}

canvas.addEventListener('dragover', (event: DragEvent) => {
  event.preventDefault();
});

canvas.addEventListener('drop', (event: DragEvent) => {
  event.preventDefault();
  const resource = event.dataTransfer?.getData("text/plain");

  if (!resource) return;

  console.log("Dropped resource:", resource);

  const newElem = createResourceElement(resource);

  const canvasRect = canvas.getBoundingClientRect();
  const x = event.clientX - canvasRect.left;
  const y = event.clientY - canvasRect.top;

  newElem.style.position = 'absolute';
  newElem.style.left = `${x - 40}px`;
  newElem.style.top = `${y - 40}px`;
  newElem.style.zIndex = '10';  // Ensure it's above the canvas

  console.log("New element position:", newElem.style.left, newElem.style.top);

  const existingResource = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
  if (existingResource && existingResource.classList.contains('resource') && existingResource !== newElem) {
    console.log("Crafting:", existingResource.dataset.element, resource);
    socket.emit('craft', [existingResource.dataset.element, resource]);
    existingResource.remove();
  } else {
    canvas.appendChild(newElem);
    startLoading(newElem);
    console.log("Added new element to canvas");
  }

  // Log canvas children for debugging
  console.log("Canvas children:", canvas.children);
});

interface CraftResult {
  error?: string;
  data?: {
    resource: string;
  };
}

socket.on('craftResult', (result: CraftResult) => {
  if (result.error) {
    resultDiv.innerHTML = `<p style="color: red;">${result.error}</p>`;
  } else if (result.data) {
    const newResource = result.data.resource.replace(/[^a-zA-Z]/g, "").toLowerCase();
    resultDiv.innerHTML = `<p>New resource created: ${newResource}</p>`;
    console.log("New resource created:", newResource);
    if (!baseResources.includes(newResource)) {
      baseResources.push(newResource);
      updatePalette();
    }
    const newElem = createResourceElement(newResource);
    newElem.style.position = 'absolute';
    newElem.style.left = `${canvas.clientWidth / 2 - 40}px`;
    newElem.style.top = `${canvas.clientHeight / 2 - 40}px`;
    newElem.style.zIndex = '10';
    canvas.appendChild(newElem);
    startLoading(newElem);
    console.log("Added crafted resource to canvas");
    startLoading(newElem);  // Start loading for the new element
    
    setTimeout(() => {
        stopLoading(newElem);
    }, 60000);  // 60 seconds to match the CSS animation
  }
});

function startLoading(elem: HTMLElement) {
  elem.classList.add('loading');
}

function stopLoading(elem: HTMLElement) {
  elem.classList.remove('loading');
}

updatePalette();