import sqlite3
import os

def show_table_contents():
    try:
        # Connect to the database
        conn = sqlite3.connect('backend/dvpn.db')
        cursor = conn.cursor()
        
        # Get table schema
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='pending_nodes';")
        schema = cursor.fetchone()
        print("Table Schema:")
        print(schema[0] if schema else "No schema found")
        
        # Try to read from pending_nodes table
        try:
            cursor.execute("SELECT * FROM pending_nodes")
            rows = cursor.fetchall()
            print("\nContents of pending_nodes table:")
            if rows:
                for row in rows:
                    print(f"Row data: {row}")
            else:
                print("No rows in table")
        except sqlite3.OperationalError as e:
            print("Error reading pending_nodes table:", e)
            
        # Close connection
        conn.close()
        
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    show_table_contents() 