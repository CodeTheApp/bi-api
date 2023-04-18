import 'dotenv/config';
import * as env from 'env-var';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { CreateProjectRequest } from './types/types';

const app = Fastify();
const prisma = new PrismaClient();

const client = new S3Client({
  region: env.get('S3_BUCKET_REGION').required().asString(),
  credentials: {
    accessKeyId: env.get('S3_BUCKET_ACCESS_KEY').required().asString(),
    secretAccessKey: env
      .get('S3_BUCKET_SECRET_ACCESS_KEY')
      .required()
      .asString(),
  },
});

app.register(cors);
app.register(multipart, { attachFieldsToBody: true });

app.get('/projects', async () => {
  const projects = await prisma.project.findMany({
    include: {
      images: true,
    },
  });

  return { projects };
});

app.get<{ Params: { id: string } }>('/image/:id', async (request, reply) => {
  const { id } = request.params;

  const images = await prisma.image.findMany({
    where: {
      projectId: +id,
    },
  });

  return images;
});

app.get<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
  const { id } = request.params;

  const project = await prisma.project.findUnique({
    where: {
      id: +id,
    },
  });

  return project ? reply.code(200).send(project) : reply.code(404).send();
});

app.post<{ Body: CreateProjectRequest }>(
  '/projects',
  async (request, reply) => {
    const { description, title, files } = request.body;

    const urls = files.map((image) => {
      return {
        path: `https://${env
          .get('S3_BUCKET_NAME')
          .required()
          .asString()}.s3.amazonaws.com/${encodeURI(image.filename)}`,
      };
    });

    const project = await prisma.project.create({
      data: {
        title: title.value,
        description: description.value,
        images: {
          create: urls,
        },
      },
    });

    if (!project) {
      return reply.code(400).send({ message: 'Error creating project' });
    }

    for (const file of files) {
      const command = new PutObjectCommand({
        Bucket: env.get('S3_BUCKET_NAME').required().asString(),
        Key: encodeURI(file.filename),
        Body: await file.toBuffer(),
        ContentType: file.mimetype,
      });
      try {
        await client.send(command);
      } catch (err) {
        console.log(err);
        break;
      }
    }

    return reply.code(201).send({ message: 'Project created' });
  }
);

app.delete<{ Params: { id: string } }>('/projects/:id', async (request) => {
  const { id } = request.params;

  const project = await prisma.project.delete({
    where: {
      id: +id,
    },
  });

  const images = await prisma.image.findMany({
    where: {
      projectId: +id,
    },
  });

  for (const image of images) {
    const command = new DeleteObjectCommand({
      Bucket: env.get('S3_BUCKET_NAME').required().asString(),
      Key: encodeURI(image.path),
    });
    try {
      await client.send(command);
    } catch (err) {
      console.log(err);
      break;
    }
  }

  const deleteImages = await prisma.image.deleteMany({
    where: {
      projectId: +id,
    },
  });

  return project && deleteImages
    ? { message: 'Project deleted' }
    : { message: 'Project not found' };
});

// ------------  START OF SERVER  ------------

app
  .listen({ port: process.env.PORT ? Number(process.env.PORT) : 80 })
  .then((address) => {
    console.log(`Server listening at ${address}`);
  });
