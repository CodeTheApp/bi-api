import 'dotenv/config';
import * as env from 'env-var';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { PrismaClient } from '@prisma/client';
import Fastify, { FastifyRequest } from 'fastify';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
  const projects = await prisma.project.findMany();
  return { projects };
});

app.get<{ Params: { id: number } }>('/projects/:id', async (request, reply) => {
  const { id } = request.params;

  const project = await prisma.project.findUnique({
    where: {
      id,
    },
  });

  return project ? reply.code(200).send(project) : reply.code(404).send();
});

app.post<{ Body: CreateProjectRequest }>(
  '/projects',
  async (request, reply) => {
    const { description, title, files } = request.body;

    for (const file of files) {
      const command = new PutObjectCommand({
        Bucket: env.get('S3_BUCKET_NAME').required().asString(),
        Key: file.filename,
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
    console.log(description.value, description);

    // console.log(description, title, files, '---BODY---');

    const urls = files.map((image) => {
      // console.log(image, '---IMAGE---');
      // const timestamp = new Date().getTime();
      // const filename =
      //   timestamp + image.filename.toLocaleLowerCase().split(' ').join('+');

      return {
        url: `https://${env
          .get('S3_BUCKET_NAME')
          .required()
          .asString()}.s3.amazonaws.com/${image.filename}`,
      };
    });

    console.log(urls, '---URLS---');

    await prisma.project.create({
      data: {
        title: title.value,
        description: description.value,
        images: {
          create: urls,
        },
      },
    });

    return reply.code(201).send({});
  }
);

app
  .listen({ port: process.env.PORT ? Number(process.env.PORT) : 3333 })
  .then((address) => {
    console.log(`Server listening at ${address}`);
  });

type CreateProjectRequest = {
  title: MultipartField;
  description: MultipartField;
  files: MultipartFile[];
};

type MultipartFile = {
  type: string;
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
};

type MultipartField = {
  type: string;
  fieldname: string;
  mimetype: string;
  encoding: string;
  value: string;
  fieldnameTruncated: boolean;
  valueTruncated: boolean;
};
