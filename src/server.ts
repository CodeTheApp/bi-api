import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';

const app = Fastify();
const prisma = new PrismaClient();

app.register(cors);

app.get('/', async () => {
  const posts = await prisma.post.findMany();
  return posts;
});

app.listen({ port: 3333 }).then((address) => {
  console.log(`Server listening at ${address}`);
});
