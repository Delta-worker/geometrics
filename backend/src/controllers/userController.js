export const userController = {
  async getAll(request, reply) {
    // Placeholder - implement with Prisma
    return { users: [] };
  },
  
  async getById(request, reply) {
    const { id } = request.params;
    return { user: { id } };
  },
  
  async create(request, reply) {
    return { message: 'User created' };
  },
  
  async update(request, reply) {
    return { message: 'User updated' };
  },
  
  async delete(request, reply) {
    return { message: 'User deleted' };
  }
};

export const userFactory = {
  getAll: userController.getAll,
  getById: userController.getById,
  create: userController.create,
  update: userController.update,
  delete: userController.delete
};
