import { io, Socket } from "socket.io-client";

const socket: Socket = io();
const palette = document.getElementById('palette') as HTMLElement;
const canvas = document.getElementById('canvas') as HTMLElement;
const resultDiv = document.getElementById('result') as HTMLElement;



type Resource = {
  name: string;
  color: string;
  produces: Resource | null;
  timeToProduce: number; // in milliseconds
  costs: Resource[];
}

// 1. add a production rate




let baseResources: string[] = ['water', 'fire', 'earth', 'air'];
let canvasResources: any[] = [];

function createResourceElement(resource: string): HTMLElement {
  const elem = document.createElement('div');
  elem.className = 'resource';
  elem.textContent = resource;
  elem.draggable = true;
  elem.dataset.element = resource;
  (elem as any).backgroundColor = getColor(resource);  // Assuming getColor is defined elsewhere
  elem.addEventListener('dragstart', drag);
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
    console.log("Added crafted resource to canvas");
  }
});

updatePalette();