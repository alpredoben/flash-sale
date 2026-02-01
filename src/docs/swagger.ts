import swaggerJsdoc from 'swagger-jsdoc';
import { Options } from 'swagger-jsdoc';
import { EnvironmentConfig } from '../configs/env.config';
import fs from 'fs';
import path from 'path';

const getInfo = (
  name: string,
  version: string,
  url: string
): swaggerJsdoc.Information => {
  return {
    title: `${name} API Documentation`,
    version: version,
    description: `This is RestFull API Flash Sales Documentation`,
    contact: {
      name: 'API Support',
      email: 'alpredo.tampubolon@gmail.com',
      url: url,
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  };
};

const getServer = (
  url: string,
  version: string,
  env: string
): swaggerJsdoc.Server[] => {
  return [
    {
      url: `${url}/api/${version}`,
      description: `${env} server`,
    },
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Local development server',
    },
  ];
};

const getTags = (): swaggerJsdoc.Tag[] => {
  return [
    {
      name: 'Authentication',
      description: 'Authentication and authorization endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
    {
      name: 'Items',
      description: 'Item management endpoints',
    },
    {
      name: 'Reservations',
      description: 'Reservation management endpoints',
    },
  ];
};

const getPaths = (): swaggerJsdoc.Paths => {
  const directory: string = path.join(__dirname, '../docs/paths');
  const readFile: string[] = fs.readdirSync(directory, {
    encoding: null,
    recursive: true,
  });

  const paths: any[] = readFile
    .filter((file) => path.extname(file) === '.json')
    .map((r: string) => {
      const filePath: string = path.join(directory, r);
      const req: any = require(filePath);
      return req;
    });
  return Object.assign({}, ...paths);
};

const getSchemas = (): swaggerJsdoc.Schema[] => {
  const directory: string = path.join(__dirname, '../docs/schemas');
  const readFile: string[] = fs.readdirSync(directory);
  const schemas: any[] = readFile
    .filter((file) => path.extname(file) === '.json')
    .map((r: string) => {
      const filePath: string = path.join(directory, r);
      const req: any = require(filePath);
      return req;
    });
  return Object.assign({}, ...schemas);
};

export const getSwaggerSpec = (environment: EnvironmentConfig) => {
  const options: Options = {
    definition: {
      openapi: '3.0.0',
      info: getInfo(
        environment.appName,
        environment.apiVersion,
        environment.appUrl
      ),
      servers: getServer(
        environment.appUrl,
        environment.apiVersion,
        environment.nodeEnv
      ),
      tags: getTags(),
      paths: getPaths(),
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your JWT token',
          },
          refreshToken: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Refresh-Token',
            description: 'Refresh token for obtaining new access token',
          },
        },
        schemas: getSchemas(),
      },
    },
    apis: ['./src/routes/*.ts', './src/routes/**/*.ts'],
  };
  return swaggerJsdoc(options);
};

export const getSwaggerUIOptions = (environment: EnvironmentConfig) => {
  return {
    customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 50px 0 }
        .swagger-ui .scheme-container { background: #fafafa; padding: 20px; }
      `,
    customSiteTitle: `${environment.appName} API Documentation`,
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      requestSnippetsEnabled: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
  };
};
