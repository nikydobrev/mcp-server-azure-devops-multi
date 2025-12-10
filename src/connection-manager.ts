import * as azdev from "azure-devops-node-api";
import { ConfigLoader } from "./config.js";

export class ConnectionManager {
  private connections: Map<string, azdev.WebApi> = new Map();
  private configLoader: ConfigLoader;

  constructor() {
    this.configLoader = new ConfigLoader();
  }

  public async getConnection(orgName: string): Promise<azdev.WebApi> {
    if (this.connections.has(orgName)) {
      return this.connections.get(orgName)!;
    }

    const pat = this.configLoader.getPat(orgName);
    if (!pat) {
      throw new Error(`No PAT found for organization: ${orgName}`);
    }

    const orgUrl = `https://dev.azure.com/${orgName}`;
    const authHandler = azdev.getPersonalAccessTokenHandler(pat);
    const connection = new azdev.WebApi(orgUrl, authHandler);

    this.connections.set(orgName, connection);
    return connection;
  }

  public getAvailableOrganizations(): string[] {
    return this.configLoader.getOrganizations();
  }
}
