#!/usr/bin/env python3
import pandas as pd
import json
import sys

def analyze_data(file_path):
    """Analyze sales data and return top product by revenue"""
    try:
        # Read CSV file
        df = pd.read_csv(file_path)
        print(f"[Python] Loaded {len(df)} rows from {file_path}", file=sys.stderr)
        
        # Ensure Revenue column exists and is numeric
        if 'Revenue' not in df.columns:
            return {
                "error": "Revenue column not found in CSV",
                "columns": df.columns.tolist()
            }
        
        # Convert Revenue to numeric, handling any currency symbols
        df['Revenue'] = pd.to_numeric(df['Revenue'].replace('[\$,]', '', regex=True))
        
        # Find top product by revenue
        top_idx = df['Revenue'].idxmax()
        top_row = df.loc[top_idx]
        
        result = {
            "success": True,
            "top_product": str(top_row['Product']),
            "top_revenue": float(top_row['Revenue']),
            "columns": df.columns.tolist(),
            "rows": len(df),
            "total_revenue": float(df['Revenue'].sum()),
            "avg_revenue": float(df['Revenue'].mean())
        }
        
        print(f"[Python] Analysis complete: {result['top_product']} with ${result['top_revenue']}", file=sys.stderr)
        return result
        
    except Exception as e:
        print(f"[Python] Error: {str(e)}", file=sys.stderr)
        return {
            "success": False,
            "error": str(e),
            "step": "Python analysis"
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
    else:
        result = analyze_data(sys.argv[1])
        print(json.dumps(result))