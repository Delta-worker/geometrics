import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Parse CSV header to get columns
function parseCSVColumns(filePath) {
  return new Promise((resolve, reject) => {
    const columns = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });
    
    rl.on('line', (line) => {
      if (line.trim()) {
        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        columns.push(...cols.filter(c => !columns.includes(c)));
        rl.close();
      }
    });
    
    rl.on('close', () => resolve(columns));
    rl.on('error', reject);
  });
}

// Count CSV rows
function countCSVRows(filePath) {
  return new Promise((resolve, reject) => {
    let count = 0;
    fs.createReadStream(filePath)
      .on('data', (chunk) => {
        for (let i = 0; i < chunk.length; i++) {
          if (chunk[i] === 10) count++;
        }
      })
      .on('end', () => resolve(count - 1)) // subtract header
      .on('error', reject);
  });
}

export const dataController = {
  // Upload CSV file
  async uploadCSV(request, reply) {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }
      
      const filename = `${Date.now()}-${data.filename}`;
      const filePath = path.join(uploadsDir, filename);
      
      const buffer = await data.toBuffer();
      fs.writeFileSync(filePath, buffer);
      
      const columns = await parseCSVColumns(filePath);
      const rowCount = await countCSVRows(filePath);
      
      const dataset = await prisma.dataSet.create({
        data: {
          name: data.filename.replace(/\.[^/.]+$/, ''),
          filename: data.filename,
          filePath: filePath,
          rowCount: rowCount,
          columnCount: columns.length,
          status: 'pending'
        }
      });
      
      return {
        success: true,
        dataset: {
          id: dataset.id,
          name: dataset.name,
          rowCount: dataset.rowCount,
          columnCount: dataset.columnCount,
          columns: columns
        }
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to upload file', details: error.message });
    }
  },
  
  // Get all datasets
  async getDatasets() {
    const datasets = await prisma.dataSet.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { datasets };
  },
  
  // Get dataset by ID
  async getDataset(request) {
    const { id } = request.params;
    const dataset = await prisma.dataSet.findUnique({
      where: { id },
      include: { columnMappings: true }
    });
    
    if (!dataset) {
      return { error: 'Dataset not found' };
    }
    
    return { dataset };
  },
  
  // Save column mappings
  async saveColumnMappings(request, reply) {
    try {
      const { id } = request.params;
      const { mappings } = request.body;
      
      // Delete existing mappings
      await prisma.columnMapping.deleteMany({
        where: { datasetId: id }
      });
      
      // Create new mappings
      if (mappings && mappings.length > 0) {
        await prisma.columnMapping.createMany({
          data: mappings.map(m => ({
            datasetId: id,
            sourceColumn: m.sourceColumn,
            targetField: m.targetField,
            dataType: m.dataType || 'string'
          }))
        });
      }
      
      // Update dataset status
      await prisma.dataSet.update({
        where: { id },
        data: { status: 'ready' }
      });
      
      return { success: true };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to save mappings' });
    }
  },
  
  // Delete dataset
  async deleteDataset(request, reply) {
    try {
      const { id } = request.params;
      
      // Get dataset to find file path
      const dataset = await prisma.dataSet.findUnique({
        where: { id }
      });
      
      if (dataset && fs.existsSync(dataset.filePath)) {
        fs.unlinkSync(dataset.filePath);
      }
      
      await prisma.dataSet.delete({
        where: { id }
      });
      
      return { success: true };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete dataset' });
    }
  }
};
