import { z } from 'zod';

const ResourceSchema = z.object({
  resource: z.string().nonempty({ message: "Resource cannot be empty" }).describe("ONE WORD to describe a new element resulting from the combined elements. The resource to craft. It should be a one word resource!"),
  emoji: z.string().nonempty({ message: "Emoji cannot be empty" }).describe("The emoji to use for the resource."),
  produces: z.string().or(z.literal(null)).describe("The resource that is produced when this resource is combined with another resource."),
});

export default ResourceSchema;

export const config = { "path": "craft", "public": true, "cache": "Common" };