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
import { getQueryStrings } from './helpers';

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
app.register(multipart, {
  attachFieldsToBody: true,
  limits: { fileSize: 100000000 },
});

// ------------- LIST PROJECT BY ID - WITH NESTED IMAGES ARRAY WHEN HAS IMAGES TRUE ON ROUTE --------------
app.get('/projects', async (request, reply) => {
  const query = getQueryStrings(request.url);

  const projects = await prisma.project.findMany({
    include: query.images ? { images: true } : undefined,
  });

  return projects
    ? reply.code(200).send({ projects })
    : reply.code(404).send({ message: 'Are no projects to show!' });
});

// ------------- LIST PROJECT BY ID  --------------
app.get<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
  const { id } = request.params;

  const project = await prisma.project.findUnique({
    where: {
      id: +id,
    },
  });

  return project
    ? reply.code(200).send(project)
    : reply.code(404).send({ message: 'Project not found' });
});

// ------------- LIST IMAGES BY PROJECT ID --------------
app.get<{ Params: { projectId: string } }>(
  '/image/:projectId',
  async (request, reply) => {
    const { projectId } = request.params;

    const images = await prisma.image.findMany({
      where: {
        projectId: +projectId,
      },
    });

    return images;
  }
);

// ------------- CREATE PROJECT --------------
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
        filename: encodeURI(image.filename),
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

// ------------- UPDATE PROJETO - title and description --------------
app.put<{ Params: { id: string }; Body: CreateProjectRequest }>(
  '/projects/:id',
  async (request, reply) => {
    const { id } = request.params;

    const data = await prisma.project.findUnique({
      where: {
        id: +id,
      },
    });

    if (!data) {
      return reply.code(404).send({ message: 'Project not found' });
    }

    const setPayload = (data: CreateProjectRequest) => {
      const payload: any = {};

      if (data.title) {
        payload.title = data.title.value;
      }

      if (data.description) {
        payload.description = data.description.value;
      }

      return payload;
    };

    const updatedProject = await prisma.project.update({
      where: {
        id: +id,
      },
      data: setPayload(request.body),
    });

    return updatedProject
      ? reply.code(200).send(updatedProject)
      : reply.code(400).send({ message: 'Project not found' });
  }
);

// ------------- DELETE PROJECT BY ID  --------------
app.delete<{ Params: { id: string } }>(
  '/projects/:id',
  async (request, reply) => {
    const { id } = request.params;

    const projectfind = await prisma.project.findUnique({
      where: {
        id: +id,
      },
    });

    if (!projectfind) {
      return reply.code(404).send({ message: 'Project not found' });
    }

    const images = await prisma.image.findMany({
      where: {
        projectId: +id,
      },
    });

    for (const image of images) {
      const command = new DeleteObjectCommand({
        Bucket: env.get('S3_BUCKET_NAME').required().asString(),
        Key: image.filename,
      });
      try {
        await client.send(command);
      } catch (err) {
        console.log(err);
        break;
      }
    }

    const deleteProject = await prisma.project.delete({
      where: {
        id: +id,
      },
    });

    return deleteProject
      ? reply.code(202).send({ message: 'Project deleted' })
      : reply.code(400).send({ message: 'Project not found' });
  }
);

// ------------- DELETE IMAGE BY ID --------------
app.delete<{ Params: { id: string } }>(
  '/image/delete/:id',
  async (request, reply) => {
    const { id } = request.params;

    const image = await prisma.image.findUnique({
      where: {
        id: +id,
      },
    });

    if (!image) {
      return reply.code(202).send({ message: 'Image not found' });
    }

    const command = new DeleteObjectCommand({
      Bucket: env.get('S3_BUCKET_NAME').required().asString(),
      Key: encodeURI(image.filename),
    });

    console.log(command);

    try {
      await client.send(command);
    } catch (err) {
      console.log(err);
    }

    const deleteImage = await prisma.image.delete({
      where: {
        id: +id,
      },
    });

    return deleteImage
      ? reply.code(202).send({ message: 'Image deleted' })
      : reply.code(400).send({ message: 'Image not found' });
  }
);

// ------------  START OF SERVER  ------------
app
  .listen({ port: process.env.PORT ? Number(process.env.PORT) : 80 })
  .then((address) => {
    console.log(`Server listening at ${address}`);
  });
