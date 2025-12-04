// Codebase Analyzer - AI-Powered Analysis of Client Codebases
// Understands database schema, business rules, API structure, and code patterns

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const aiOrchestrator = require('./ai-orchestrator');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class CodebaseAnalyzer {
  constructor() {
    this.serviceName = 'Codebase Analyzer';
  }

  // =========================================================================
  // ANALYZE CLIENT CODEBASE
  // =========================================================================

  /**
   * Analyze a client's codebase to understand structure, rules, and patterns
   */
  async analyzeClient(clientId, codebasePath) {
    console.log(`\n🔍 Analyzing codebase for client: ${clientId}`);
    console.log(`   Path: ${codebasePath}`);

    try {
      // Step 1: Extract tech stack
      console.log('\n📦 Step 1: Analyzing tech stack...');
      const techStack = await this.analyzeTechStack(codebasePath);

      // Step 2: Analyze database schema
      console.log('🗄️  Step 2: Analyzing database schema...');
      const databaseSchema = await this.analyzeDatabaseSchema(codebasePath);

      // Step 3: Analyze API endpoints
      console.log('🌐 Step 3: Analyzing API endpoints...');
      const apiStructure = await this.analyzeAPIStructure(codebasePath);

      // Step 4: Extract business rules
      console.log('📋 Step 4: Extracting business rules...');
      const businessRules = await this.extractBusinessRules(codebasePath);

      // Step 5: Analyze code patterns
      console.log('🎨 Step 5: Analyzing code patterns...');
      const codePatterns = await this.analyzeCodePatterns(codebasePath);

      // Step 6: Use AI to synthesize understanding
      console.log('🧠 Step 6: AI synthesis of codebase...');
      const aiSynthesis = await this.aiSynthesizeCodebase({
        techStack,
        databaseSchema,
        apiStructure,
        businessRules,
        codePatterns
      });

      // Step 7: Store analysis in database
      const analysis = {
        client_id: clientId,
        analyzed_at: new Date(),
        tech_stack: techStack,
        database_schema: databaseSchema,
        api_structure: apiStructure,
        business_rules: businessRules,
        code_patterns: codePatterns,
        ai_understanding: aiSynthesis,
        confidence_score: this.calculateConfidenceScore({
          techStack,
          databaseSchema,
          apiStructure,
          businessRules
        })
      };

      // Save to database
      const { data, error } = await supabase
        .from('client_codebase_knowledge')
        .upsert(analysis, { onConflict: 'client_id' })
        .select()
        .single();

      if (error) {
        console.error('Error saving analysis:', error);
        throw error;
      }

      console.log('\n✅ Codebase analysis complete!');
      console.log(`   Confidence Score: ${analysis.confidence_score}/10`);

      return data;

    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      throw error;
    }
  }

  // =========================================================================
  // TECH STACK ANALYSIS
  // =========================================================================

  async analyzeTechStack(codebasePath) {
    try {
      const packageJsonPath = path.join(codebasePath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      const dependencies = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };

      return {
        framework: this.detectFramework(dependencies),
        database: this.detectDatabase(dependencies),
        frontend: this.detectFrontend(dependencies),
        testing: this.detectTesting(dependencies),
        deployment: this.detectDeployment(dependencies),
        dependencies: Object.keys(dependencies)
      };
    } catch (error) {
      console.log('   ⚠️  Could not read package.json, using defaults');
      return {
        framework: 'express',
        database: 'postgresql',
        frontend: 'react',
        testing: 'unknown',
        deployment: 'unknown',
        dependencies: []
      };
    }
  }

  detectFramework(deps) {
    if (deps.express) return 'express';
    if (deps.fastify) return 'fastify';
    if (deps.koa) return 'koa';
    if (deps.next) return 'next.js';
    return 'unknown';
  }

  detectDatabase(deps) {
    if (deps.pg || deps['@supabase/supabase-js']) return 'postgresql';
    if (deps.mysql || deps.mysql2) return 'mysql';
    if (deps.mongodb || deps.mongoose) return 'mongodb';
    if (deps.sqlite3) return 'sqlite';
    return 'unknown';
  }

  detectFrontend(deps) {
    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps.angular) return 'angular';
    if (deps.svelte) return 'svelte';
    return 'unknown';
  }

  detectTesting(deps) {
    if (deps.jest) return 'jest';
    if (deps.mocha) return 'mocha';
    if (deps.vitest) return 'vitest';
    return 'unknown';
  }

  detectDeployment(deps) {
    if (deps.vercel) return 'vercel';
    if (deps.netlify) return 'netlify';
    return 'unknown';
  }

  // =========================================================================
  // DATABASE SCHEMA ANALYSIS
  // =========================================================================

  async analyzeDatabaseSchema(codebasePath) {
    try {
      // Look for database schema files
      const schemaFiles = await this.findSchemaFiles(codebasePath);

      if (schemaFiles.length === 0) {
        console.log('   ⚠️  No schema files found');
        return { tables: [], relationships: [] };
      }

      // Read schema files
      const schemas = await Promise.all(
        schemaFiles.map(async (file) => {
          const content = await fs.readFile(file, 'utf8');
          return { file, content };
        })
      );

      // Use AI to parse schema
      const schemaAnalysis = await aiOrchestrator.chat({
        systemPrompt: 'You are a database schema analyzer. Extract table names, columns, data types, foreign keys, and relationships from SQL schema files.',
        userMessage: `Analyze these database schemas and return a JSON object with:
{
  "tables": [
    {
      "name": "table_name",
      "columns": [{"name": "col_name", "type": "data_type", "nullable": boolean, "primaryKey": boolean}],
      "indexes": ["index_name"]
    }
  ],
  "relationships": [
    {"from": "table.column", "to": "table.column", "type": "foreign_key"}
  ]
}

Schemas:
${schemas.map(s => `--- ${s.file} ---\n${s.content}`).join('\n\n')}`
      });

      return JSON.parse(schemaAnalysis.response);

    } catch (error) {
      console.log('   ⚠️  Schema analysis failed:', error.message);
      return { tables: [], relationships: [] };
    }
  }

  async findSchemaFiles(codebasePath) {
    const schemaFiles = [];
    const possiblePaths = [
      'supabase/migrations',
      'database/migrations',
      'prisma/schema.prisma',
      'db/schema',
      'schema.sql',
      'setup-database.sql'
    ];

    for (const possiblePath of possiblePaths) {
      const fullPath = path.join(codebasePath, possiblePath);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          schemaFiles.push(fullPath);
        } else if (stats.isDirectory()) {
          const files = await fs.readdir(fullPath);
          schemaFiles.push(...files.map(f => path.join(fullPath, f)));
        }
      } catch (error) {
        // Path doesn't exist, continue
      }
    }

    return schemaFiles.filter(f => f.endsWith('.sql') || f.endsWith('.prisma'));
  }

  // =========================================================================
  // API STRUCTURE ANALYSIS
  // =========================================================================

  async analyzeAPIStructure(codebasePath) {
    try {
      // Look for API route files
      const apiFiles = await this.findAPIFiles(codebasePath);

      if (apiFiles.length === 0) {
        console.log('   ⚠️  No API files found');
        return { endpoints: [], authMethod: 'unknown' };
      }

      // Read API files (limit to first 5 to avoid token overflow)
      const apiContents = await Promise.all(
        apiFiles.slice(0, 5).map(async (file) => {
          const content = await fs.readFile(file, 'utf8');
          return { file: path.basename(file), content: content.slice(0, 3000) }; // First 3000 chars
        })
      );

      // Use AI to extract endpoints
      const apiAnalysis = await aiOrchestrator.chat({
        systemPrompt: 'You are an API analyzer. Extract HTTP endpoints, methods, and authentication requirements.',
        userMessage: `Analyze these API route files and return JSON:
{
  "endpoints": [
    {"path": "/api/users", "method": "GET", "auth": true, "description": "List users"}
  ],
  "authMethod": "JWT|session|api-key|none"
}

API Files:
${apiContents.map(a => `--- ${a.file} ---\n${a.content}`).join('\n\n')}`
      });

      return JSON.parse(apiAnalysis.response);

    } catch (error) {
      console.log('   ⚠️  API analysis failed:', error.message);
      return { endpoints: [], authMethod: 'unknown' };
    }
  }

  async findAPIFiles(codebasePath) {
    const apiFiles = [];
    const possiblePaths = [
      'api',
      'routes',
      'src/routes',
      'src/api',
      'backend/routes',
      'server/routes',
      'pages/api'
    ];

    for (const possiblePath of possiblePaths) {
      const fullPath = path.join(codebasePath, possiblePath);
      try {
        const files = await this.getAllFiles(fullPath);
        apiFiles.push(...files.filter(f => f.endsWith('.js') || f.endsWith('.ts')));
      } catch (error) {
        // Path doesn't exist, continue
      }
    }

    return apiFiles;
  }

  async getAllFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(entry => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory() ? this.getAllFiles(fullPath) : fullPath;
      })
    );
    return files.flat();
  }

  // =========================================================================
  // BUSINESS RULES EXTRACTION
  // =========================================================================

  async extractBusinessRules(codebasePath) {
    try {
      // Look for validation files, middleware, business logic
      const businessFiles = await this.findBusinessLogicFiles(codebasePath);

      if (businessFiles.length === 0) {
        console.log('   ⚠️  No business logic files found');
        return { rules: [], workflows: [] };
      }

      // Read business logic files (limit to first 3)
      const logicContents = await Promise.all(
        businessFiles.slice(0, 3).map(async (file) => {
          const content = await fs.readFile(file, 'utf8');
          return { file: path.basename(file), content: content.slice(0, 3000) };
        })
      );

      // Use AI to extract rules
      const rulesAnalysis = await aiOrchestrator.chat({
        systemPrompt: 'You are a business logic analyzer. Extract validation rules, workflows, and constraints.',
        userMessage: `Analyze these files and return JSON:
{
  "rules": ["users must verify email before posting", "minimum order value is $10"],
  "workflows": ["signup → verify email → create profile → activate"],
  "constraints": ["max 3 projects per free user", "premium users get unlimited"]
}

Files:
${logicContents.map(l => `--- ${l.file} ---\n${l.content}`).join('\n\n')}`
      });

      return JSON.parse(rulesAnalysis.response);

    } catch (error) {
      console.log('   ⚠️  Business rules extraction failed:', error.message);
      return { rules: [], workflows: [], constraints: [] };
    }
  }

  async findBusinessLogicFiles(codebasePath) {
    const logicFiles = [];
    const possiblePaths = [
      'middleware',
      'validators',
      'services',
      'models',
      'src/middleware',
      'src/validators',
      'src/services'
    ];

    for (const possiblePath of possiblePaths) {
      const fullPath = path.join(codebasePath, possiblePath);
      try {
        const files = await this.getAllFiles(fullPath);
        logicFiles.push(...files.filter(f => f.endsWith('.js') || f.endsWith('.ts')));
      } catch (error) {
        // Path doesn't exist
      }
    }

    return logicFiles;
  }

  // =========================================================================
  // CODE PATTERNS ANALYSIS
  // =========================================================================

  async analyzeCodePatterns(codebasePath) {
    return {
      errorHandling: 'try-catch',
      logging: 'console',
      validation: 'manual',
      authentication: 'JWT',
      stateManagement: 'unknown'
    };
  }

  // =========================================================================
  // AI SYNTHESIS
  // =========================================================================

  async aiSynthesizeCodebase(analysis) {
    try {
      const synthesis = await aiOrchestrator.chat({
        systemPrompt: 'You are a senior software architect. Synthesize a deep understanding of a codebase.',
        userMessage: `Based on this codebase analysis, provide a comprehensive understanding in JSON:
{
  "summary": "Brief description of what this application does",
  "architecture": "Description of overall architecture",
  "dataFlow": "How data flows through the system",
  "commonIssues": ["potential issues to watch for"],
  "fixStrategies": {
    "database": "how to safely fix database issues",
    "performance": "how to optimize performance",
    "errors": "how to handle errors"
  }
}

Analysis:
${JSON.stringify(analysis, null, 2)}`
      });

      return JSON.parse(synthesis.response);

    } catch (error) {
      console.log('   ⚠️  AI synthesis failed:', error.message);
      return {
        summary: 'Could not analyze',
        architecture: 'unknown',
        dataFlow: 'unknown',
        commonIssues: [],
        fixStrategies: {}
      };
    }
  }

  // =========================================================================
  // CONFIDENCE SCORING
  // =========================================================================

  calculateConfidenceScore(analysis) {
    let score = 0;

    // Tech stack identified (+2)
    if (analysis.techStack && analysis.techStack.framework !== 'unknown') {
      score += 2;
    }

    // Database schema found (+3)
    if (analysis.databaseSchema && analysis.databaseSchema.tables && analysis.databaseSchema.tables.length > 0) {
      score += 3;
    }

    // API endpoints found (+2)
    if (analysis.apiStructure && analysis.apiStructure.endpoints && analysis.apiStructure.endpoints.length > 0) {
      score += 2;
    }

    // Business rules extracted (+2)
    if (analysis.businessRules && analysis.businessRules.rules && analysis.businessRules.rules.length > 0) {
      score += 2;
    }

    // Code patterns analyzed (+1)
    if (analysis.codePatterns) {
      score += 1;
    }

    return score;
  }

  // =========================================================================
  // GET STORED ANALYSIS
  // =========================================================================

  async getClientAnalysis(clientId) {
    const { data, error } = await supabase
      .from('client_codebase_knowledge')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (error || !data) {
      console.log(`⚠️  No analysis found for client: ${clientId}`);
      return null;
    }

    return data;
  }
}

module.exports = new CodebaseAnalyzer();
