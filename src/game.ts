import type { Server } from "http";
import { io, Socket } from "socket.io-client";

const socket: Socket = io();
const palette = document.getElementById('palette') as HTMLElement;
const canvas = document.getElementById('canvas') as HTMLElement;
const resultDiv = document.getElementById('result') as HTMLElement;


type ServerResource = {
  name: string;
  color: string;
  emoji: string;
  product: string | null;
  recipe: [string, string] | null;
}

type Resource = {
  name: string;
  color: string;
  emoji: string;
  product: Resource | null;
  recipe: [Resource, Resource] | null; // this must exist in the canvas for the factory to produce the "produces" resource and must be of length 2
}

const fire: ServerResource = {
  name: 'fire',
  color: '#e74c3c',
  emoji: '🔥',
  product: null,
  recipe: null,
}

// "base resource" (it has no recipe, it is given by the game)
const iron: ServerResource = {
  name: 'iron',
  color: '#b2b2b2',
  emoji: '⛏️',
  product: null,
  recipe: null,
}

// intermediate resource (it has a recipe, but no product)
const gear: ServerResource = {
  name: 'gear',
  color: '#fff',
  emoji: '⚙️',
  product: null,
  recipe: ["fire", "iron"],
}

// factory resurces (it has a product, AND a recipe)
const ironFactory: ServerResource = {
  name: 'iron factory',
  color: '#fff',
  emoji: '🔩',
  product: "iron",
  recipe: ["gear", "gear"],
}

const gearFactory: ServerResource = {
  name: 'gear factory',
  color: '#fff',
  emoji: '🏭',
  product: "gear",
  recipe: ["ironFactory", "ironFactory"],
}

// 1. add a production rate
const PRODUCTION_RATE = 10;

// initialize resourceLibrary to JUST fire and iron
let resourceLibrary: Record<string, ServerResource> = {
  "fire": fire,
  "iron": iron,
}

type ResourceInstance = {
  id: string;
  resource: ServerResource;
  htmlElement: HTMLElement;
}

let canvasResources: ResourceInstance[] = [];

function getContrastColor(hex: string): string {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');

  // Parse the r, g, b values
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Calculate the brightness of the color
  let brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Return black for bright colors and white for dark colors
  return brightness > 155 ? '#000000' : '#FFFFFF';
}


function createResourceInstance(resource: ServerResource): ResourceInstance {
  const elem = document.createElement('div');
  elem.style.backgroundColor = resource.color;
  elem.style.color = getContrastColor(resource.color);

  elem.className = `resource ${resource.name}`;
  elem.textContent = resource.name;
  elem.draggable = true;
  elem.dataset.resource = resource.name;
  const uniqueId = `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  elem.dataset.id = uniqueId;
  elem.addEventListener('dragstart', drag);
  const resourceInstance: ResourceInstance = {
    id: uniqueId,
    resource,
    htmlElement: elem,
  }
  console.log("new resourceInstance made, adding to canvas resources", resourceInstance)
  canvasResources.push(resourceInstance);
  return resourceInstance;
}

function updatePalette(): void {
  palette.innerHTML = '';
  Object.values(resourceLibrary).forEach(resource => {
    const resourceInstance = createResourceInstance(resource);
    palette.appendChild(resourceInstance.htmlElement);
  });
}

function drag(event: DragEvent): void {
  if (event.dataTransfer && event.target instanceof HTMLElement) {
    event.dataTransfer.setData("text/plain", event.target.dataset.id || "");
  }
}

canvas.addEventListener('dragover', (event: DragEvent) => {
  event.preventDefault();
});

canvas.addEventListener('drop', (event: DragEvent) => {

  // get the resource from the canvasResources using the event
  event.preventDefault();
  // this is the id of the DROPPED resource (the one that was being dragged and is now being dropped)
  // event.target is likely the resource underneath this (the one being dropped on.)
  const resourceId = event.dataTransfer?.getData("text/plain");
  console.log(resourceId)
  if (!resourceId) return;
  const resourceInstance = canvasResources.find(resource => resource.id === resourceId);
  console.log("resourceInstance", resourceInstance)
  if (!resourceInstance) {
    // const resourceInstance = palette.
    console.log("no resource instance found on the canvas, attempting to create");
    // const newResourceInstance = createResourceInstance(resourceInstance.resource);
    return;
  }

  console.log("Dropped resource instance:", resourceInstance);

  const newResourceInstance = createResourceInstance(resourceInstance.resource);
  const newElem = newResourceInstance.htmlElement;

  const canvasRect = canvas.getBoundingClientRect();
  const x = event.clientX - canvasRect.left;
  const y = event.clientY - canvasRect.top;

  newElem.style.position = 'absolute';
  newElem.style.left = `${x - 40}px`;
  newElem.style.top = `${y - 40}px`;
  newElem.style.zIndex = '10';  // Ensure it's above the canvas

  console.log("New element position:", newElem.style.left, newElem.style.top);

  // existing resource is the resource underneath the dropped resource
  const existingResource = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
  console.log("existingResource", existingResource)
  if (existingResource && existingResource.classList.contains('resource') && existingResource !== newElem) {
    const existingResourceInstance = canvasResources.find(resource => resource.htmlElement === existingResource)
    console.log("existingResourceInstance", existingResourceInstance)
    if (!existingResourceInstance) return;
    console.log("Crafting:", existingResourceInstance.resource, resourceInstance.resource);
    socket.emit('craft', [existingResourceInstance.resource, resourceInstance.resource]);
    existingResource.remove();
  } else {
    canvas.appendChild(newElem);
    console.log("Added new element to canvas");
  }

  // Log canvas children for debugging
  console.log("Canvas children:", canvas.children);
});

interface CraftResult {
  error?: string;
  data?: {
    resource: ServerResource;
  };
}

socket.on('craftResult', (result: { success: boolean, data: ServerResource, error: undefined | string }) => {
  if (result.error) {
    resultDiv.innerHTML = `<p style="color: red;">${result.error}</p>`;
  } else if (result.data) {
    console.log("result.data", result.data)

    const newResource = result.data;
    console.log("newResource", newResource)

    resultDiv.innerHTML = `<p>New resource created: ${newResource}</p>`;
    console.log("New resource created:", newResource);
    // IF THE RESOURCE IS UNIQUE
    if (!Object.keys(resourceLibrary).includes(newResource.name)) {
      resourceLibrary[newResource.name] = newResource;
      updatePalette();
    }
    const resourceInstance = createResourceInstance(newResource);
    const newElem = resourceInstance.htmlElement;
    newElem.style.position = 'absolute';
    newElem.style.left = `${canvas.clientWidth / 2 - 40}px`;
    newElem.style.top = `${canvas.clientHeight / 2 - 40}px`;
    newElem.style.zIndex = '10';
    canvas.appendChild(newElem);
    console.log("Added crafted resource to canvas");
  }
});

updatePalette();