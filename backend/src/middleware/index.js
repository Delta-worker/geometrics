// Request/Response logging middleware
export async function loggingMiddleware(request, reply) {
  const start = Date.now();
  
  reply.raw.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${request.method} ${request.url} - ${reply.statusCode} (${duration}ms)`);
  });
}

// Error handler middleware
export async function errorHandler(error, request, reply) {
  request.log.error(error);
  reply.status(500).send({
    error: 'Internal Server Error',
    message: error.message
  });
}
