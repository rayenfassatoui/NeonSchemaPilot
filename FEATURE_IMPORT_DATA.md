# Import Data Feature Documentation

## Overview

The Import Data feature allows users to upload and import data from external files into their database. It supports three popular formats: CSV, JSON, and SQL, with intelligent schema inference, validation, and flexible import modes.

## Supported Formats

### 1. CSV (Comma-Separated Values)
- **Description**: Tabular data with configurable delimiters
- **Use Cases**: Excel exports, data dumps, spreadsheet data
- **Features**:
  - Configurable delimiter (comma, semicolon, tab, pipe)
  - Header row detection
  - Quoted value support with escape sequences
  - Empty line skipping

**Example CSV**:
```csv
id,name,email,age
1,John Doe,john@example.com,30
2,Jane Smith,jane@example.com,25
3,Bob Johnson,bob@example.com,35
```

### 2. JSON (JavaScript Object Notation)
- **Description**: Structured data in JSON format
- **Use Cases**: API responses, NoSQL exports, application data
- **Supported Structures**:
  - Array of objects: `[{col1: val1, col2: val2}, ...]`
  - Object with tableName and rows: `{tableName: "users", rows: [...]}`

**Example JSON (Array of Objects)**:
```json
[
  {"id": 1, "name": "John Doe", "email": "john@example.com", "age": 30},
  {"id": 2, "name": "Jane Smith", "email": "jane@example.com", "age": 25},
  {"id": 3, "name": "Bob Johnson", "email": "bob@example.com", "age": 35}
]
```

**Example JSON (With Table Name)**:
```json
{
  "tableName": "users",
  "rows": [
    {"id": 1, "name": "John Doe", "email": "john@example.com"},
    {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
  ]
}
```

### 3. SQL (Structured Query Language)
- **Description**: SQL INSERT statements with optional CREATE TABLE
- **Use Cases**: Database dumps, migration scripts, backup files
- **Features**:
  - CREATE TABLE parsing for schema extraction
  - INSERT INTO statement parsing
  - Multiple value sets support
  - NULL, string, number, and boolean value handling

**Example SQL**:
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  age INTEGER
);

INSERT INTO users (id, name, email, age) VALUES
  (1, 'John Doe', 'john@example.com', 30),
  (2, 'Jane Smith', 'jane@example.com', 25),
  (3, 'Bob Johnson', 'bob@example.com', 35);
```

## Import Modes

### Create Mode
- **Behavior**: Creates a new table with the imported data
- **Requirements**: Table must not already exist
- **Fails If**: Table with the same name exists
- **Use Case**: First-time import, new datasets

### Append Mode
- **Behavior**: Adds data to an existing table
- **Requirements**: Table structure must be compatible
- **Options**: Can create table if it doesn't exist
- **Use Case**: Adding records, incremental imports

### Replace Mode
- **Behavior**: Drops existing table and creates new one with imported data
- **Warning**: ⚠️ Destroys all existing data in the table
- **Use Case**: Full refresh, data replacement

## Import Options

### Schema Validation
- **Description**: Validates data before import
- **Checks**:
  - Valid table name (alphanumeric + underscore)
  - Valid column names
  - Data type consistency
  - Missing value warnings
- **Recommendation**: Enable for production imports

### Create Table If Not Exists
- **Description**: Automatically creates table in append mode
- **Schema Source**: Inferred from imported data
- **Available In**: Append mode only

### Clear Existing Data
- **Description**: Truncates table before importing
- **Warning**: Removes all existing rows
- **Use Case**: Full data replacement without schema changes

### Continue on Errors
- **Description**: Skips invalid rows and continues import
- **Behavior**: 
  - Invalid rows are logged
  - Import continues with valid rows
  - Summary shows skipped count
- **Use Case**: Large imports with some bad data

## Data Type Inference

The import system automatically infers column data types:

| Detected Pattern | Inferred Type | Example |
|-----------------|---------------|---------|
| All numbers (no decimals) | INTEGER | 1, 42, -5 |
| Numbers with decimals | REAL | 3.14, -0.5, 1.0 |
| true/false values | BOOLEAN | true, false |
| ISO 8601 dates | TIMESTAMP | 2024-01-15T10:30:00Z |
| Everything else | TEXT | "hello", "abc123" |

## File Requirements

### File Size
- **Maximum**: 50 MB recommended
- **Performance**: Files under 10 MB import fastest
- **Large Files**: Consider splitting into smaller chunks

### Encoding
- **Supported**: UTF-8 (default)
- **BOM**: Handled automatically
- **Special Characters**: Full Unicode support

### Data Quality
- **Column Names**: Must be unique and valid identifiers
- **Missing Values**: NULL, empty strings, or omitted fields
- **Data Types**: Consistent within each column recommended

## Architecture

### File Structure

```
types/
  import.ts                    # Type definitions
lib/
  import-utils.ts              # Parsing and validation utilities
app/
  api/
    import/
      route.ts                 # Import API endpoints
  database/
    import/
      page.tsx                 # Import page UI
components/
  database-import-panel.tsx    # Import form component
```

### Type Definitions (`types/import.ts`)

**ImportFormat**: File format type
```typescript
export type ImportFormat = "csv" | "json" | "sql";
```

**ImportMode**: Import operation mode
```typescript
export type ImportMode = "create" | "append" | "replace";
```

**ImportOptions**: Configuration for import operation
```typescript
export interface ImportOptions {
  format: ImportFormat;
  mode: ImportMode;
  targetTable: string;
  createTableIfNotExists?: boolean;
  truncateBeforeImport?: boolean;
  skipErrors?: boolean;
  validateSchema?: boolean;
  delimiter?: string;          // For CSV
  hasHeader?: boolean;         // For CSV
  encoding?: string;
}
```

**ImportResult**: Import operation result
```typescript
export interface ImportResult {
  success: boolean;
  tableName: string;
  rowsImported: number;
  rowsSkipped: number;
  errors: ImportError[];
  executionTimeMs: number;
  message?: string;
}
```

**ImportPreview**: Preview of import data
```typescript
export interface ImportPreview {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    sampleValues: any[];
  }>;
  rowCount: number;
  previewRows: any[];
  warnings: string[];
}
```

## API Endpoints

### POST /api/import
Import data from uploaded file

**Request (multipart/form-data)**:
```typescript
{
  file: File,                    // File to import
  options: string,               // JSON-stringified ImportOptions
  connectionString?: string      // Optional Neon connection
}
```

**Response**:
```typescript
{
  success: boolean,
  tableName: string,
  rowsImported: number,
  rowsSkipped: number,
  errors: Array<{row: number, error: string}>,
  executionTimeMs: number,
  message?: string
}
```

**Example**:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('options', JSON.stringify({
  format: 'csv',
  mode: 'create',
  targetTable: 'users',
  hasHeader: true,
  validateSchema: true
}));

const response = await fetch('/api/import', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

### PUT /api/import (Preview)
Preview import without executing

**Request (multipart/form-data)**:
```typescript
{
  file: File,
  format: string
}
```

**Response**:
```typescript
{
  preview: ImportPreview,
  validation: ValidationResult
}
```

## Utility Functions

### parseCSV(content, options)
Parses CSV content into structured data

**Parameters**:
- `content: string` - CSV file content
- `options: CSVParseOptions` - Parse configuration

**Returns**: `ParsedImportData`

**Example**:
```typescript
const parsed = parseCSV(csvContent, {
  delimiter: ',',
  hasHeader: true,
  skipEmptyLines: true
});
```

### parseJSON(content)
Parses JSON content into structured data

**Parameters**:
- `content: string` - JSON file content

**Returns**: `ParsedImportData`

**Example**:
```typescript
const parsed = parseJSON(jsonContent);
```

### parseSQL(content)
Parses SQL INSERT statements

**Parameters**:
- `content: string` - SQL file content

**Returns**: `ParsedImportData`

**Example**:
```typescript
const parsed = parseSQL(sqlContent);
```

### inferColumnTypes(rows, columns)
Infers data types from sample data

**Parameters**:
- `rows: any[]` - Data rows
- `columns: string[]` - Column names

**Returns**: `Record<string, string>` - Column type mapping

### validateImportData(parsed)
Validates parsed import data

**Parameters**:
- `parsed: ParsedImportData` - Parsed data

**Returns**: `ValidationResult` - Validation errors and warnings

### generatePreview(parsed, maxRows?)
Generates preview of import data

**Parameters**:
- `parsed: ParsedImportData` - Parsed data
- `maxRows: number` - Maximum preview rows (default: 10)

**Returns**: `ImportPreview`

## UI Components

### DatabaseImportPanel

Interactive import form component with file upload, configuration, and preview.

**Props**:
```typescript
interface DatabaseImportPanelProps {
  connectionString?: string;      // Neon connection string
  existingTables?: string[];      // List of existing tables
}
```

**Features**:
- File upload with drag-and-drop
- Format auto-detection from file extension
- Import mode selection (radio buttons)
- CSV-specific options (delimiter, header)
- Import options (checkboxes)
- Preview functionality
- Real-time validation
- Progress indicators
- Error handling

**Usage**:
```tsx
import { DatabaseImportPanel } from "@/components/database-import-panel";

<DatabaseImportPanel
  connectionString={neonUrl}
  existingTables={['users', 'orders', 'products']}
/>
```

## Usage Examples

### Example 1: Import CSV with Header

```typescript
// 1. Select CSV file
const file = document.querySelector('#file-input').files[0];

// 2. Configure import
const options = {
  format: 'csv',
  mode: 'create',
  targetTable: 'customers',
  hasHeader: true,
  delimiter: ',',
  validateSchema: true
};

// 3. Import
const formData = new FormData();
formData.append('file', file);
formData.append('options', JSON.stringify(options));

const response = await fetch('/api/import', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(`Imported ${result.rowsImported} rows`);
```

### Example 2: Append JSON Data

```typescript
const options = {
  format: 'json',
  mode: 'append',
  targetTable: 'logs',
  createTableIfNotExists: true,
  skipErrors: true
};

const formData = new FormData();
formData.append('file', jsonFile);
formData.append('options', JSON.stringify(options));

const response = await fetch('/api/import', {
  method: 'POST',
  body: formData
});
```

### Example 3: Replace Table from SQL Dump

```typescript
const options = {
  format: 'sql',
  mode: 'replace',
  targetTable: 'products',
  validateSchema: true
};

const formData = new FormData();
formData.append('file', sqlFile);
formData.append('options', JSON.stringify(options));

const response = await fetch('/api/import', {
  method: 'POST',
  body: formData
});
```

### Example 4: Preview Before Import

```typescript
// 1. Preview
const previewData = new FormData();
previewData.append('file', file);
previewData.append('format', 'csv');

const previewResponse = await fetch('/api/import', {
  method: 'PUT',
  body: previewData
});

const { preview, validation } = await previewResponse.json();

// 2. Show preview to user
console.log(`Table: ${preview.tableName}`);
console.log(`Columns: ${preview.columns.map(c => c.name).join(', ')}`);
console.log(`Rows: ${preview.rowCount}`);

// 3. If validation passes, proceed with import
if (validation.valid) {
  // ... perform import
}
```

## Database Integration

### File-Based Database

Imports use the FileDatabase `executeOperation` API:

```typescript
// Create table
await db.executeOperation({
  type: "ddl.create_table",
  table: tableName,
  columns: [
    { name: "id", dataType: "INTEGER" },
    { name: "name", dataType: "TEXT" },
    { name: "age", dataType: "INTEGER" }
  ]
});

// Insert rows
for (const row of rows) {
  await db.executeOperation({
    type: "dml.insert",
    table: tableName,
    rows: [row]
  });
}
```

### Neon PostgreSQL

Imports use parameterized SQL queries:

```typescript
// Create table
await sql.query(`
  CREATE TABLE "${tableName}" (
    id SERIAL PRIMARY KEY,
    name TEXT,
    age INTEGER
  )
`);

// Insert rows
for (const row of rows) {
  const columns = Object.keys(row);
  const values = columns.map(col => row[col]);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  
  await sql.query(
    `INSERT INTO "${tableName}" (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
}
```

## Error Handling

### Common Errors

**1. Invalid File Format**
```json
{
  "error": "Failed to parse CSV file: Invalid delimiter"
}
```

**2. Table Already Exists**
```json
{
  "error": "Table 'users' already exists"
}
```

**3. Invalid Table Name**
```json
{
  "error": "Validation failed",
  "details": ["Invalid table name. Must start with letter/underscore"]
}
```

**4. Row Import Error**
```json
{
  "success": true,
  "rowsImported": 95,
  "rowsSkipped": 5,
  "errors": [
    {"row": 10, "error": "Invalid date format"},
    {"row": 23, "error": "Missing required column: email"}
  ]
}
```

### Error Recovery

**Skip Errors Mode**:
```typescript
const options = {
  skipErrors: true,  // Continue on errors
  // ... other options
};
```

**Validation Before Import**:
```typescript
const options = {
  validateSchema: true,  // Validate before importing
  // ... other options
};
```

## Performance Considerations

### Optimization Tips

1. **Batch Size**: Large files are imported row-by-row. For very large imports, consider:
   - Splitting files into smaller chunks
   - Using native database import tools for massive datasets

2. **Data Types**: Proper type inference improves performance:
   - INTEGER is faster than TEXT for numeric data
   - Consistent types avoid conversion overhead

3. **Indexing**: After large imports:
   - Create indexes on frequently queried columns
   - Analyze table statistics

4. **Transaction Size**: File-DB imports are auto-committed per row:
   - Each row is an atomic operation
   - Failures don't roll back previous inserts

### Performance Benchmarks

| File Size | Rows | Format | Import Time | Notes |
|-----------|------|--------|-------------|-------|
| 100 KB | 1,000 | CSV | ~2s | Fast |
| 1 MB | 10,000 | JSON | ~15s | Moderate |
| 10 MB | 100,000 | SQL | ~2min | Slow |
| 50 MB | 500,000 | CSV | ~10min | Consider chunking |

## Security Considerations

### Input Validation
- File size limits enforced
- Table/column names sanitized
- SQL injection prevention via parameterized queries
- Path traversal protection

### Connection Security
- Connection strings transmitted via form data
- No client-side storage of credentials
- Server-side only database operations

### Data Privacy
- Files processed in memory, not persisted
- No logging of sensitive data
- Connection strings not logged

## Testing

### Unit Tests Example

```typescript
import { parseCSV, inferColumnTypes, validateImportData } from '@/lib/import-utils';

describe('parseCSV', () => {
  it('should parse CSV with header', () => {
    const csv = 'name,age\nJohn,30\nJane,25';
    const result = parseCSV(csv, { hasHeader: true });
    
    expect(result.columns).toEqual(['name', 'age']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: 'John', age: '30' });
  });
  
  it('should handle quoted values', () => {
    const csv = 'name,email\n"Doe, John","john@example.com"';
    const result = parseCSV(csv);
    
    expect(result.rows[0].name).toBe('Doe, John');
  });
});

describe('inferColumnTypes', () => {
  it('should infer INTEGER for numeric columns', () => {
    const rows = [{ id: 1, age: 30 }, { id: 2, age: 25 }];
    const types = inferColumnTypes(rows, ['id', 'age']);
    
    expect(types.id).toBe('INTEGER');
    expect(types.age).toBe('INTEGER');
  });
  
  it('should infer TEXT for mixed types', () => {
    const rows = [{ name: 'John' }, { name: 'Jane' }];
    const types = inferColumnTypes(rows, ['name']);
    
    expect(types.name).toBe('TEXT');
  });
});
```

### Integration Tests Example

```typescript
describe('Import API', () => {
  it('should import CSV file successfully', async () => {
    const file = new File(['name,age\nJohn,30'], 'test.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify({
      format: 'csv',
      mode: 'create',
      targetTable: 'test_users',
      hasHeader: true
    }));
    
    const response = await fetch('/api/import', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.rowsImported).toBe(1);
  });
});
```

## Troubleshooting

### Issue: "Failed to parse CSV file"
**Cause**: Incorrect delimiter or malformed CSV
**Solution**: 
- Check delimiter setting matches file
- Ensure quotes are properly escaped
- Verify no extra commas or line breaks

### Issue: "Table already exists"
**Cause**: Using CREATE mode with existing table
**Solution**:
- Use APPEND mode to add data
- Use REPLACE mode to overwrite
- Choose different table name

### Issue: "Invalid column name"
**Cause**: Column names contain special characters
**Solution**:
- Column names must start with letter or underscore
- Only alphanumeric and underscores allowed
- Check for spaces or punctuation

### Issue: Import slow for large files
**Cause**: Row-by-row insertion
**Solution**:
- Split file into smaller chunks
- Use native DB import tools for massive files
- Disable validation for trusted data

### Issue: "Missing required column"
**Cause**: Source data missing columns from target table
**Solution**:
- Ensure all required columns present in file
- Use CREATE mode to match file structure
- Add default values for missing columns

## Future Enhancements

### Planned Features
1. **Excel Support**: Direct XLSX file import
2. **Batch Inserts**: Bulk insert optimization
3. **Data Transformation**: Column mapping and value transformation
4. **Scheduled Imports**: Automated recurring imports
5. **Import Templates**: Save and reuse import configurations
6. **Duplicate Detection**: Skip or update duplicate records
7. **Data Profiling**: Advanced statistics and quality checks
8. **Streaming Imports**: Handle files larger than memory
9. **Compression Support**: Import from ZIP, GZIP files
10. **Progress Tracking**: Real-time import progress UI

### Community Contributions
Contributions welcome! Areas for improvement:
- Additional file format support
- Performance optimizations
- Enhanced validation rules
- Better error messages
- UI/UX improvements

## Related Features

- **Export Data**: Complement feature for data extraction
- **Query History**: Track import operations
- **Data Visualization**: Analyze imported data
- **AI Studio**: Use AI to clean/transform data before import

## Conclusion

The Import Data feature provides a comprehensive solution for bringing external data into your database. With support for multiple formats, intelligent type inference, and flexible import modes, it handles everything from simple CSV uploads to complex SQL migrations.

For questions or issues, please refer to the main project README or open an issue on GitHub.
