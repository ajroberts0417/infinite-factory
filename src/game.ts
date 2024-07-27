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



let baseResources: string[] = ['water', 'fire', 'earth', 'Steam Engine'];
let canvasResources: any[] = [];

function createResourceElement(resource: string): HTMLElement {
  const elem = document.createElement('div');
  elem.className = 'resource';
  elem.textContent = resource;
  elem.draggable = true;
  elem.dataset.element = resource;
  elem.addEventListener('dragstart', drag);
  
  // Add a loading circle
  if (resource === "Steam Engine") {
    const loadingCircle = document.createElement('div');
    loadingCircle.className = 'loading-circle';
    elem.appendChild(loadingCircle);
  }
  
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

    setTimeout(() => {
      console.log("--------stopLoading 2--------")
      stopLoading(newElem);
    }, 6000);

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
  console.log("--------craftResult--------")

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
    }, 2000);  // 60 seconds to match the CSS animation
  }
});

function startLoading(elem: HTMLElement) {
  elem.classList.add('loading');
}

function stopLoading(elem: HTMLElement) {
  elem.classList.remove('loading');

  // Step 1: Get all elements on the canvas and their positions
  const resources = Array.from(canvas.getElementsByClassName('resource')) as HTMLElement[];

  // Step 2: Exclude the current element
  const otherResources = resources.filter(resource => resource !== elem);

  // Step 3: Calculate distances to the current element
  const elemRect = elem.getBoundingClientRect();
  const elemCenterX = elemRect.left + elemRect.width / 2;
  const elemCenterY = elemRect.top + elemRect.height / 2;

  const distances = otherResources.map(resource => {
    const rect = resource.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt(Math.pow(centerX - elemCenterX, 2) + Math.pow(centerY - elemCenterY, 2));
    return { resource, distance };
  });

  // Step 4: Find the closest 2 elements
  distances.sort((a, b) => a.distance - b.distance);
  const closestTwo = distances.slice(0, 2);

  // Step 5: Animate the closest two elements
  let animationsCompleted = 0;
  closestTwo.forEach(({ resource }) => {
    const startLeft = parseInt(resource.style.left);
    const startTop = parseInt(resource.style.top);
    const endLeft = parseInt(elem.style.left);
    const endTop = parseInt(elem.style.top);

    animateElement(resource, startLeft, startTop, endLeft, endTop, () => {
      animationsCompleted++;
      if (animationsCompleted === closestTwo.length) {
        // All animations completed, now change text to "Steam"
        resources.forEach(resource => {
          resource.textContent = "Steam";
        });
      }
    });
  });
}

function animateElement(element: HTMLElement, startLeft: number, startTop: number, endLeft: number, endTop: number, onComplete: () => void) {
  const duration = 1000; // Animation duration in milliseconds
  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);

    const currentLeft = startLeft + (endLeft - startLeft) * progress;
    const currentTop = startTop + (endTop - startTop) * progress;

    element.style.left = `${currentLeft}px`;
    element.style.top = `${currentTop}px`;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      onComplete(); // Call the onComplete callback when animation is finished
    }
  }

  requestAnimationFrame(step);
}

updatePalette();