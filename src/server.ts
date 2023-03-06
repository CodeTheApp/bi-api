import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';
import { z } from 'zod';

const app = Fastify();
const prisma = new PrismaClient();

app.register(cors);

app.get('/projects', async () => {
  const projects = await prisma.project.findMany();

  return { projects };
});

app.get('/projects/:id', async (request, reply) => {
  const showProjectSchema = z.object({
    id: z.string().uuid(),
  });

  const { id } = showProjectSchema.parse(request.params);

  const project = await prisma.project.findUnique({
    where: {
      id,
    },
  });

  return project ? reply.code(200).send(project) : reply.code(404).send();
});

app.post('/projects', async (request, reply) => {
  const createProjectSchema = z.object({
    title: z.string(),
    description: z.string(),
  });

  const { description, title } = createProjectSchema.parse(request.body);

  await prisma.project.create({
    data: {
      title,
      description,
    },
  });

  return reply.code(201).send();
});

app
  .listen({ port: process.env.PORT ? Number(process.env.PORT) : 3333 })
  .then((address) => {
    console.log(`Server listening at ${address}`);
  });
