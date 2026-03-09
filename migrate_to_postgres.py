import logging
from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.exc import IntegrityError

# Configure logging to print progress
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def migrate_sqlite_to_postgres():
    # 1 & 2. Connection Strings
    sqlite_uri = 'sqlite:///pdf_templates.db'
    pg_uri = 'postgresql://postgres:password009@localhost:5432/diamond_lab_db'
    
    logging.info("Connecting to SQLite database...")
    sqlite_engine = create_engine(sqlite_uri)
    
    logging.info("Connecting to PostgreSQL database...")
    pg_engine = create_engine(pg_uri)
    
    # Reflect SQLite database metadata
    logging.info("Reflecting SQLite database schema...")
    sqlite_metadata = MetaData()
    try:
        sqlite_metadata.reflect(bind=sqlite_engine)
    except Exception as e:
        logging.error(f"Failed to read SQLite schema: {e}")
        return
    
    # Create PostgreSQL metadata
    pg_metadata = MetaData()
    
    # 3. Recreate tables in PostgreSQL with the same structure
    for table_name, sqlite_table in sqlite_metadata.tables.items():
        logging.info(f"Preparing schema for table: {table_name}")
        
        # Copy columns and handling DATETIME specifically for Postgres
        from sqlalchemy import DateTime
        columns = []
        for col in sqlite_table.columns:
            new_col = col.copy()
            if 'DATETIME' in str(new_col.type).upper():
                new_col.type = DateTime()
            columns.append(new_col)
            
        Table(table_name, pg_metadata, *columns)
    
    # Create tables in PostgreSQL (checkfirst=True ensures we don't accidentally overwrite or drop existing ones)
    logging.info("Creating tables in PostgreSQL (existing tables will be skipped)...")
    try:
        pg_metadata.create_all(bind=pg_engine, checkfirst=True)
        logging.info("PostgreSQL tables are ready.")
    except Exception as e:
        logging.error(f"Failed to create tables in PostgreSQL: {e}")
        return
    
    # 4 & 5. Transfer all data from SQLite to PostgreSQL
    for table_name, sqlite_table in sqlite_metadata.tables.items():
        logging.info(f"\n--- Migrating data for table: {table_name} ---")
        pg_table = pg_metadata.tables[table_name]
        
        try:
            with sqlite_engine.connect() as sqlite_conn:
                # Read all rows from SQLite
                result = sqlite_conn.execute(sqlite_table.select())
                rows = result.fetchall()
                keys = result.keys()
                
                if not rows:
                    logging.info(f"Table '{table_name}' is empty. Skipping data migration.")
                    continue
                
                # Convert rows to dictionaries for easy insertion
                data_to_insert = [dict(zip(keys, row)) for row in rows]
                total_rows = len(data_to_insert)
                logging.info(f"Found {total_rows} rows to migrate for '{table_name}'.")
                
                # Insert data in chunks to be memory efficient and faster
                chunk_size = 500
                inserted_count = 0
                
                for i in range(0, total_rows, chunk_size):
                    chunk = data_to_insert[i:i + chunk_size]
                    
                    try:
                        # Attempt to insert the chunk
                        with pg_engine.begin() as pg_conn:
                            pg_conn.execute(pg_table.insert(), chunk)
                        inserted_count += len(chunk)
                        logging.info(f"Migrated {inserted_count}/{total_rows} rows...")
                    except IntegrityError:
                        logging.warning("Chunk insertion hit an IntegrityError (e.g., duplicate primary key). Falling back to row-by-row safe insertion.")
                        # 6 & 8. Handle conflicts/Constraints: Fall back to row-by-row to skip duplicates safely
                        for row_data in chunk:
                            try:
                                with pg_engine.begin() as pg_conn_row:
                                    pg_conn_row.execute(pg_table.insert(), [row_data])
                                    inserted_count += 1
                            except IntegrityError:
                                # Primary key already exists or constraint violation, skip to avoid deleting/corrupting data
                                pass 
                            except Exception as ex:
                                logging.error(f"Error inserting individual row: {ex}")
                    except Exception as e:
                        logging.error(f"Unexpected error during chunk insertion: {e}")
            
                logging.info(f"Finished migrating '{table_name}'. Total successfully inserted: {inserted_count}/{total_rows}")
        
        except Exception as e:
            logging.error(f"An error occurred while migrating table '{table_name}': {e}")
            
    logging.info("\nDatabase migration completed successfully!")

if __name__ == '__main__':
    migrate_sqlite_to_postgres()
