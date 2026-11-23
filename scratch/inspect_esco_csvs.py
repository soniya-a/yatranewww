import os
import glob
import csv

CSV_DIR = r"D:\ESCO dataset - v1.2.1 - classification - en - csv"
csv.field_size_limit(2147483647)

files = sorted(glob.glob(os.path.join(CSV_DIR, "*.csv")))
print(f"Total CSV files found: {len(files)}")

for f in files:
    fname = os.path.basename(f)
    if fname == "esco_import_report.csv":
        print(f"EXCLUDING: {fname}")
        continue
    
    with open(f, mode='r', encoding='utf-8', errors='replace') as fp:
        reader = csv.reader(fp)
        try:
            header = next(reader)
        except StopIteration:
            header = []
        
        row_count = 0
        inconsistent_rows = 0
        for row in reader:
            row_count += 1
            if len(row) != len(header):
                inconsistent_rows += 1
                
        print(f"File: {fname} | Header cols: {len(header)} | Rows: {row_count} | Inconsistent width rows: {inconsistent_rows}")
        if inconsistent_rows > 0:
            print(f"  Sample headers: {header[:5]}...")
