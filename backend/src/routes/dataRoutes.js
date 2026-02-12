import { dataController } from '../controllers/dataController.js';

export async function dataRoutes(fastify, options) {
  // Upload CSV
  fastify.post('/api/data/upload', {
    schema: {
      description: 'Upload a CSV file',
      tags: ['data']
    }
  }, dataController.uploadCSV);
  
  // Get all datasets
  fastify.get('/api/data/datasets', {
    schema: {
      description: 'Get all datasets',
      tags: ['data']
    }
  }, dataController.getDatasets);
  
  // Get dataset by ID
  fastify.get('/api/data/datasets/:id', {
    schema: {
      description: 'Get a specific dataset',
      tags: ['data'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, dataController.getDataset);
  
  // Save column mappings
  fastify.post('/api/data/datasets/:id/mappings', {
    schema: {
      description: 'Save column mappings for a dataset',
      tags: ['data'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          mappings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sourceColumn: { type: 'string' },
                targetField: { type: 'string' },
                dataType: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, dataController.saveColumnMappings);
  
  // Delete dataset
  fastify.delete('/api/data/datasets/:id', {
    schema: {
      description: 'Delete a dataset',
      tags: ['data'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, dataController.deleteDataset);
}
