import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { PrismaClient } from '@prisma/client';
import Fastify, { FastifyRequest } from 'fastify';
import { z } from 'zod';

import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';

const app = Fastify();
const prisma = new PrismaClient();

// Bota num ENV isso daqui
const client = new S3Client({region: 'us-east-1', credentials: {accessKeyId: "AKIASHKU6UOXLMUCGOXX", secretAccessKey: "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"}});

app.register(cors);
app.register(multipart, { attachFieldsToBody: true })

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

app.post<{Body: CreateProjectRequest}>('/projects', async (request, reply) => {
  const {files} = request.body;

  for(const file of files) {
    // Bota no nome do bucket num .env também
    const command = new PutObjectCommand({Bucket: "bi-api-img", Key: file.filename, Body: await file.toBuffer(), ContentType: file.mimetype});
    try {
      await client.send(command)
    } catch(err) {
      console.log(err);
      break;
    }
  }

  // const createProjectSchema = z.object({
  //   title: z.string(),
  //   description: z.string(),
  // });

  // const { description, title } = createProjectSchema.parse(request.body);

  // await prisma.project.create({
  //   data: {
  //     title,
  //     description,
  //   },
  // });

  return reply.code(201).send({});
});

app
  .listen({ port: process.env.PORT ? Number(process.env.PORT) : 3333 })
  .then((address) => {
    console.log(`Server listening at ${address}`);
  });



type CreateProjectRequest = {
  files: MultipartFile[]
};

type MultipartFile = {
  type: string;
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
}