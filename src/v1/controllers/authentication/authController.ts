// create an authController.ts file in the src/v1/controllers/authentication folder

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import * as env from 'env-var';

import {
  CreateUserRequest,
  LoginRequest,
} from '../../requests/createUserRequest';

const prisma = new PrismaClient();

export const authController = (app: FastifyInstance) => {
  // ------------- REGISTER --------------
  app.post<{ Body: CreateUserRequest }>('/register', async (request, reply) => {
    const { email, password, username } = request.body;

    const hashedPassword = await hash(password.value, 10);

    const user = await prisma.user.create({
      data: {
        email: email.value,
        password: hashedPassword,
      },
    });

    if (!user) {
      return reply.code(400).send({ message: 'Error creating user' });
    }

    return reply.code(201).send({ message: 'User created' });
  });

  // ------------- LOGIN --------------
  app.post<{ Body: LoginRequest }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    const user = await prisma.user.findUnique({
      where: {
        email: email.value,
      },
    });

    if (!user) {
      return reply.code(400).send({ message: 'User not found' });
    }

    const isPasswordCorrect = await compare(password.value, user.password);

    if (!isPasswordCorrect) {
      return reply
        .code(400)
        .send({ message: 'Login infos is not valid, verify and try again' });
    }

    const token = sign(
      { id: user.id, email: user.email },
      env.get('JWT_SECRET').required().asString(),
      {
        expiresIn: '1d',
      }
    );

    return reply.code(200).send({ token });
  });

  // ------------- GET USER --------------

  app.get<{ Params: { id: string } }>('/user/:id', async (request, reply) => {
    const { id } = request.params;

    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });

    return user
      ? reply.code(200).send(user)
      : reply.code(404).send({ message: 'User not found' });
  });

  // ------------- UPDATE USER --------------

  app.put<{ Params: { id: string }; Body: CreateUserRequest }>(
    '/user/:id',
    async (request, reply) => {
      const { id } = request.params;

      const { email, password, username } = request.body;

      const hashedPassword = await hash(password.value, 10);

      const user = await prisma.user.update({
        where: {
          id: id,
        },
        data: {
          email: email.value,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
        },
      });

      return user
        ? reply.code(200).send(user)
        : reply.code(404).send({ message: 'User not found' });
    }
  );

  // ------------- RECOVERY PASSWORD --------------
  app.post<{ Body: LoginRequest }>('/recovery', async (request, reply) => {
    const { email } = request.body;

    const user = await prisma.user.findUnique({
      where: {
        email: email.value,
      },
    });

    if (!user) {
      return reply.code(400).send({ message: 'User not found' });
    }

    return reply.code(200).send({ message: 'Email sent' });
  });
};

export default authController;
