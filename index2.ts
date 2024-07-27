import forge from "./forge/client";
const readline = require('readline');
import prompt from "prompt-sync";

let baseResource = ["fire", "water", "earth", "air"];

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

while (true) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const answer = prompt()("What resources do you want to combine? Enter the two elements separated by a comma: ");

    if (answer === "exit" || answer === "quit") {
        break;
    }

    const resources = answer.split(",");

    if (answer.length < 2) {
        console.log("Please provide at least two (comma separated) resources.");
        continue;
    }

    if (!baseResource.includes(clean(resources[0])) || !baseResource.includes(clean(resources[1]))) {
        console.log("Please provide valid resources. The resources should be one of the following: \033[92m", baseResource.join(", ") + "\033[0m");
        continue;
    }

    const data = await forge.craft.query(getPrompt(resources[0], resources[1]));

    baseResource.push(clean(data.resource));

    console.log(data);
}

