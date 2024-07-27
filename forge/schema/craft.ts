import { z } from 'zod';


export type Resource = {
  name: string;
  color: string;
  emoji: string;
  product: string | null;
  recipe: [string, string] | null; // this must exist in the canvas for the factory to produce the "produces" resource and must be of length 2
}

const ResourceSchema = z.object({
  name: z.string().nonempty({ message: "Name cannot be empty" }).describe("The name of the resource."),
  color: z.string().nonempty({ message: "Color cannot be empty" }).describe("The color of the resource."),
  emoji: z.string().nonempty({ message: "Emoji cannot be empty" }).describe("The emoji to use for the resource."),
  product: z.string().or(z.null()).describe("The product resource that this resource can produce. It MUST be a resource that already exists in the resource library."),
});

export default ResourceSchema;

export const config = { "path": "craft", "public": true, "cache": "Common" };