# Example Import Files

This directory contains sample data files in different formats that you can use to test the Import Data feature.

## Files

### 1. `sample_users.csv`
**Format**: CSV (Comma-Separated Values)  
**Records**: 10 employees  
**Columns**: 8 columns (id, name, email, age, department, salary, hire_date, is_active)

**Use Case**: Employee/user data import  
**Import Settings**:
- Format: CSV
- Delimiter: Comma (,)
- Has Header: Yes
- Target Table: `users` or `employees`

**Data Types**:
- INTEGER: id, age, salary
- TEXT: name, email, department
- TIMESTAMP: hire_date
- BOOLEAN: is_active

---

### 2. `sample_products.json`
**Format**: JSON (Array of Objects)  
**Records**: 10 products  
**Columns**: 10 columns (id, name, category, price, stock, sku, supplier, is_available, rating, release_date)

**Use Case**: E-commerce product catalog import  
**Import Settings**:
- Format: JSON
- Target Table: `products` or `inventory`

**Data Types**:
- INTEGER: id, stock
- TEXT: name, category, sku, supplier
- REAL: price, rating
- BOOLEAN: is_available
- TIMESTAMP: release_date

**Note**: Includes an out-of-stock item (Webcam HD) to demonstrate inventory management scenarios.

---

### 3. `sample_orders.sql`
**Format**: SQL (INSERT statements with CREATE TABLE)  
**Records**: 10 orders  
**Columns**: 10 columns (id, order_number, customer_name, customer_email, order_date, total_amount, status, shipping_address, is_paid, notes)

**Use Case**: Order management system data migration  
**Import Settings**:
- Format: SQL
- Target Table: `orders`

**Data Types**:
- INTEGER: id
- TEXT: order_number, customer_name, customer_email, status, shipping_address, notes
- TIMESTAMP: order_date
- REAL: total_amount
- BOOLEAN: is_paid

**Special Features**:
- Contains CREATE TABLE statement for schema definition
- Includes various order statuses (Completed, Shipped, Processing, Pending, Cancelled)
- Some records have NULL values in the notes column
- Mix of paid and unpaid orders

---

## How to Use These Files

### Step 1: Navigate to Import Page
1. Start your application: `bun dev`
2. Open http://localhost:3000
3. Connect to your database (Neon or use file-based DB)
4. Navigate to **Import data** from the navigation menu

### Step 2: Upload File
1. Click **Choose File** button
2. Select one of the example files from this directory
3. The format will be auto-detected based on file extension

### Step 3: Configure Import
**For CSV (sample_users.csv)**:
- Format: CSV
- Delimiter: Comma (,)
- First row contains column names: ✓
- Mode: Create new table
- Target Table: `employees`

**For JSON (sample_products.json)**:
- Format: JSON
- Mode: Create new table
- Target Table: `products`

**For SQL (sample_orders.sql)**:
- Format: SQL
- Mode: Create new table (or Replace if table exists)
- Target Table: `orders`

### Step 4: Preview (Optional)
Click **Preview Data** to see:
- Detected columns and their types
- Sample data rows
- Row count
- Any warnings

### Step 5: Import
Click **Import Data** to execute the import.

---

## Testing Scenarios

### Scenario 1: First-Time Import (CREATE Mode)
```
File: sample_users.csv
Mode: Create
Expected: New table created with 10 rows
```

### Scenario 2: Append Additional Data
```
1. Import sample_users.csv (Create mode)
2. Modify the CSV file with new records (change IDs to 11-15)
3. Import again (Append mode)
Expected: Table now has 15 rows
```

### Scenario 3: Replace Data
```
1. Import sample_products.json (Create mode)
2. Modify the JSON file
3. Import again (Replace mode)
Expected: Old data removed, new data imported
```

### Scenario 4: Error Handling
```
1. Import sample_orders.sql
2. Try to import again (Create mode)
Expected: Error - Table already exists
Solution: Use Append or Replace mode
```

### Scenario 5: Different Delimiters
Create a semicolon-separated file:
```csv
id;name;email
1;John Doe;john@example.com
2;Jane Smith;jane@example.com
```
Import Settings:
- Delimiter: Semicolon (;)

---

## Data Relationships

These sample files can be used together to create a relational database:

```
employees (sample_users.csv)
  └─> Can be linked to orders via customer_email

products (sample_products.json)
  └─> Can be used to create order_items table

orders (sample_orders.sql)
  └─> Links customers to their orders
```

---

## Modifying Examples

Feel free to modify these files to test different scenarios:

1. **Add more records**: Copy and paste rows/objects with new IDs
2. **Change data types**: Convert numbers to strings to test validation
3. **Add NULL values**: Test handling of missing data
4. **Invalid data**: Add malformed rows to test error handling
5. **Large datasets**: Duplicate rows to test performance

---

## Common Issues and Solutions

### Issue: "Table already exists"
**Solution**: Change import mode to "Append" or "Replace"

### Issue: "Invalid column name"
**Solution**: Ensure column names contain only letters, numbers, and underscores

### Issue: CSV parsing error
**Solution**: Check that delimiter matches file format and quotes are properly escaped

### Issue: JSON parsing error
**Solution**: Validate JSON syntax using a JSON validator

### Issue: SQL parsing error
**Solution**: Ensure INSERT statements follow the expected format

---

## Advanced Examples

### CSV with Custom Delimiter (Pipe-separated)
```csv
id|name|department
1|John Doe|Engineering
2|Jane Smith|Marketing
```

### JSON with Table Name
```json
{
  "tableName": "customers",
  "rows": [
    {"id": 1, "name": "John"},
    {"id": 2, "name": "Jane"}
  ]
}
```

### SQL with Multiple INSERT Patterns
```sql
-- Single insert
INSERT INTO users (id, name) VALUES (1, 'John');

-- Multiple values
INSERT INTO users (id, name) VALUES (2, 'Jane'), (3, 'Bob');
```

---

## Performance Tips

- **Small files** (< 1 MB): Import directly
- **Medium files** (1-10 MB): Consider enabling "Skip errors" for resilience
- **Large files** (> 10 MB): Split into smaller chunks or use native DB tools

---

## Need More Examples?

You can generate additional sample data using:
- **Mockaroo**: https://mockaroo.com/
- **Faker.js**: For programmatic data generation
- **ChatGPT**: Ask for sample data in specific formats

Or export data from your existing database using the **Export Data** feature and reimport it!
