#!/usr/bin/env node

/**
 * Generate TypeScript type definitions from OpenAPI specifications
 * 
 * This script recursively processes all JSON files in rest-api-specs/
 * and generates corresponding .d.ts files in the types/ directory,
 * maintaining the original directory structure.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const SPECS_DIR = path.join(__dirname, '..', 'rest-api-specs');
const TYPES_DIR = path.join(__dirname, '..', 'types');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

/**
 * Recursively find all JSON files in a directory
 * @param {string} dir - Directory to search
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Array<{inputPath: string, relativePath: string}>}
 */
function findJsonFiles(dir, baseDir = dir) {
  const results = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        results.push(...findJsonFiles(fullPath, baseDir));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const relativePath = path.relative(baseDir, fullPath);
        results.push({
          inputPath: fullPath,
          relativePath: relativePath,
        });
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error reading directory ${dir}:${colors.reset}`, error.message);
  }
  
  return results;
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to create
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generate TypeScript types for a single OpenAPI spec file
 * @param {string} inputPath - Path to the OpenAPI spec JSON file
 * @param {string} outputPath - Path where the .d.ts file should be written
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function generateTypes(inputPath, outputPath) {
  try {
    // Ensure the output directory exists
    ensureDirectoryExists(path.dirname(outputPath));
    
    // Use openapi-typescript CLI via npx
    const command = `npx openapi-typescript "${inputPath}" --output "${outputPath}"`;
    
    await execAsync(command, {
      cwd: path.join(__dirname, '..'),
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large specs
    });
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(`${colors.blue}╔════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  OpenAPI TypeScript Type Generator                ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  // Verify specs directory exists
  if (!fs.existsSync(SPECS_DIR)) {
    console.error(`${colors.red}Error: Specs directory not found: ${SPECS_DIR}${colors.reset}`);
    process.exit(1);
  }
  
  // Find all JSON spec files
  console.log(`${colors.gray}Scanning for OpenAPI specs...${colors.reset}`);
  const specFiles = findJsonFiles(SPECS_DIR);
  
  if (specFiles.length === 0) {
    console.log(`${colors.yellow}No JSON files found in ${SPECS_DIR}${colors.reset}`);
    process.exit(0);
  }
  
  console.log(`${colors.green}Found ${specFiles.length} spec file(s)${colors.reset}\n`);
  
  // Clean and recreate types directory
  if (fs.existsSync(TYPES_DIR)) {
    console.log(`${colors.gray}Cleaning existing types directory...${colors.reset}`);
    fs.rmSync(TYPES_DIR, { recursive: true, force: true });
  }
  ensureDirectoryExists(TYPES_DIR);
  
  // Process each spec file
  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;
  const errors = [];
  
  for (let i = 0; i < specFiles.length; i++) {
    const { inputPath, relativePath } = specFiles[i];
    const outputPath = path.join(
      TYPES_DIR,
      relativePath.replace(/\.json$/, '.d.ts')
    );
    
    const fileName = path.basename(relativePath);
    const dirName = path.dirname(relativePath);
    const displayPath = dirName === '.' ? fileName : `${dirName}/${fileName}`;
    
    process.stdout.write(
      `${colors.gray}[${i + 1}/${specFiles.length}]${colors.reset} Generating types for ${colors.blue}${displayPath}${colors.reset}...`
    );
    
    const result = await generateTypes(inputPath, outputPath);
    
    if (result.success) {
      console.log(` ${colors.green}✓${colors.reset}`);
      successCount++;
    } else {
      console.log(` ${colors.red}✗${colors.reset}`);
      failureCount++;
      errors.push({
        file: displayPath,
        error: result.error,
      });
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✓ Success:${colors.reset} ${successCount}/${specFiles.length}`);
  
  if (failureCount > 0) {
    console.log(`${colors.red}✗ Failed:${colors.reset} ${failureCount}/${specFiles.length}`);
    console.log(`\n${colors.yellow}Errors:${colors.reset}`);
    errors.forEach(({ file, error }) => {
      console.log(`  ${colors.red}•${colors.reset} ${file}`);
      console.log(`    ${colors.gray}${error}${colors.reset}`);
    });
  }
  
  console.log(`${colors.gray}⏱  Duration:${colors.reset} ${duration}s`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);
  
  if (failureCount > 0) {
    console.log(`${colors.yellow}⚠  Some files failed to generate. Please review the errors above.${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}🚀 Type generation completed successfully!${colors.reset}`);
  console.log(`${colors.gray}   Generated types are available in: ${TYPES_DIR}${colors.reset}\n`);
}

// Run the script
main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

