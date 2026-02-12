import { userFactory } from './userController';

export const userRoutes = async (fastify, options) => {
  fastify.get('/users', userFactory.getAll);
  fastify.get('/users/:id', userFactory.getById);
  fastify.post('/users', userFactory.create);
  fastify.put('/users/:id', userFactory.update);
  fastify.delete('/users/:id', userFactory.delete);
};
