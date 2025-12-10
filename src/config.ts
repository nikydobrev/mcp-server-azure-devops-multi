import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (one level up from dist/config.js)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const ConfigSchema = z.record(z.string(), z.string());

export type Config = z.infer<typeof ConfigSchema>;

export class ConfigLoader {
  private config: Config = {};

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    // Resolve config.json relative to the compiled script location (dist/config.js -> ../config.json)
    const configPath = path.resolve(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const fileContent = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.config = ConfigSchema.parse(parsed);
      } catch (error) {
        console.error('Error loading config.json:', error);
      }
    } else {
        console.warn('config.json not found. Please create one to map organizations to PATs.');
    }
  }

  public getPat(orgName: string): string | undefined {
    return this.config[orgName];
  }

  public getOrganizations(): string[] {
    return Object.keys(this.config);
  }
}
