#!/usr/bin/env python3
"""
Acre Data Processing Pipeline
Handles ETL operations for business data with support for multiple formats
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime
import boto3
from typing import Dict, List, Any, Optional
import logging
from sqlalchemy import create_engine
import psycopg2
from io import BytesIO

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AcreDataProcessor:
    """Main data processing class for Acre platform"""
    
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.bucket_name = os.environ.get('S3_BUCKET_NAME', 'acre-data-uploads')
        self.db_url = os.environ.get('DATABASE_URL')
        
        if self.db_url:
            self.engine = create_engine(self.db_url)
    
    def process_file(self, file_path: str, file_type: str, user_id: int) -> Dict[str, Any]:
        """
        Process uploaded file and extract structured data
        
        Args:
            file_path: Path to the file
            file_type: Type of file (csv, xlsx, json)
            user_id: ID of the user who uploaded the file
            
        Returns:
            Dictionary containing processed data and metadata
        """
        try:
            logger.info(f"Processing {file_type} file for user {user_id}")
            
            # Read file based on type
            if file_type.lower() in ['csv']:
                df = pd.read_csv(file_path)
            elif file_type.lower() in ['xlsx', 'xls']:
                df = pd.read_excel(file_path)
            elif file_type.lower() == 'json':
                df = pd.read_json(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
            
            # Clean and validate data
            df = self._clean_data(df)
            
            # Analyze data structure
            schema = self._analyze_schema(df)
            
            # Generate insights
            insights = self._generate_insights(df)
            
            # Upload to S3
            s3_key = self._upload_to_s3(file_path, user_id)
            
            # Store processed data
            processed_data = {
                'rows': df.to_dict('records'),
                'schema': schema,
                'insights': insights,
                'row_count': len(df),
                'columns': list(df.columns),
                's3_key': s3_key,
                'processed_at': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Successfully processed {len(df)} rows")
            return processed_data
            
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            raise
    
    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and standardize data"""
        # Remove completely empty rows
        df = df.dropna(how='all')
        
        # Strip whitespace from string columns
        string_columns = df.select_dtypes(include=['object']).columns
        for col in string_columns:
            df[col] = df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)
        
        # Convert date columns
        date_patterns = ['date', 'time', 'created', 'updated', 'modified']
        for col in df.columns:
            if any(pattern in col.lower() for pattern in date_patterns):
                try:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                except:
                    pass
        
        return df
    
    def _analyze_schema(self, df: pd.DataFrame) -> Dict[str, str]:
        """Analyze data schema and types"""
        schema = {}
        
        for col in df.columns:
            dtype = str(df[col].dtype)
            
            # Map pandas types to database types
            if 'int' in dtype:
                schema[col] = 'integer'
            elif 'float' in dtype:
                schema[col] = 'number'
            elif 'datetime' in dtype:
                schema[col] = 'datetime'
            elif 'bool' in dtype:
                schema[col] = 'boolean'
            else:
                # Check if it's actually a date string
                sample = df[col].dropna().head(10)
                if sample.apply(lambda x: self._is_date_string(str(x))).all():
                    schema[col] = 'date'
                else:
                    schema[col] = 'string'
        
        return schema
    
    def _is_date_string(self, value: str) -> bool:
        """Check if a string looks like a date"""
        date_formats = [
            '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y',
            '%Y/%m/%d', '%d-%m-%Y', '%m-%d-%Y'
        ]
        
        for fmt in date_formats:
            try:
                datetime.strptime(value, fmt)
                return True
            except:
                continue
        
        return False
    
    def _generate_insights(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate business insights from data"""
        insights = {
            'summary_stats': {},
            'patterns': [],
            'recommendations': []
        }
        
        # Numeric columns statistics
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            insights['summary_stats'][col] = {
                'mean': float(df[col].mean()),
                'median': float(df[col].median()),
                'std': float(df[col].std()),
                'min': float(df[col].min()),
                'max': float(df[col].max())
            }
        
        # Date range for time series
        date_cols = df.select_dtypes(include=['datetime64']).columns
        if len(date_cols) > 0:
            date_col = date_cols[0]
            insights['date_range'] = {
                'start': df[date_col].min().isoformat(),
                'end': df[date_col].max().isoformat(),
                'days': (df[date_col].max() - df[date_col].min()).days
            }
        
        # Detect patterns
        if 'revenue' in df.columns.str.lower():
            revenue_col = [col for col in df.columns if 'revenue' in col.lower()][0]
            insights['patterns'].append({
                'type': 'revenue_trend',
                'total': float(df[revenue_col].sum()),
                'average': float(df[revenue_col].mean())
            })
        
        return insights
    
    def _upload_to_s3(self, file_path: str, user_id: int) -> str:
        """Upload file to S3 with proper isolation"""
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = os.path.basename(file_path)
        s3_key = f"business-{user_id}/{timestamp}_{filename}"
        
        try:
            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ServerSideEncryption': 'AES256',
                    'Metadata': {
                        'userId': str(user_id),
                        'uploadDate': datetime.utcnow().isoformat()
                    }
                }
            )
            logger.info(f"Uploaded file to S3: {s3_key}")
            return s3_key
        except Exception as e:
            logger.error(f"S3 upload failed: {str(e)}")
            raise
    
    def sync_external_data(self, source_type: str, connection_config: Dict) -> Dict[str, Any]:
        """Sync data from external sources"""
        logger.info(f"Syncing data from {source_type}")
        
        if source_type == 'mysql':
            return self._sync_mysql(connection_config)
        elif source_type == 'postgresql':
            return self._sync_postgresql(connection_config)
        elif source_type == 'api':
            return self._sync_api(connection_config)
        else:
            raise ValueError(f"Unsupported source type: {source_type}")
    
    def _sync_mysql(self, config: Dict) -> Dict[str, Any]:
        """Sync data from MySQL database"""
        import mysql.connector
        
        conn = mysql.connector.connect(
            host=config['host'],
            user=config['username'],
            password=config['password'],
            database=config['database']
        )
        
        query = config.get('query', f"SELECT * FROM {config.get('table', 'users')} LIMIT 1000")
        df = pd.read_sql(query, conn)
        conn.close()
        
        return {
            'rows': df.to_dict('records'),
            'row_count': len(df),
            'columns': list(df.columns)
        }
    
    def _sync_postgresql(self, config: Dict) -> Dict[str, Any]:
        """Sync data from PostgreSQL database"""
        conn_str = f"postgresql://{config['username']}:{config['password']}@{config['host']}:{config.get('port', 5432)}/{config['database']}"
        engine = create_engine(conn_str)
        
        query = config.get('query', f"SELECT * FROM {config.get('table', 'users')} LIMIT 1000")
        df = pd.read_sql(query, engine)
        
        return {
            'rows': df.to_dict('records'),
            'row_count': len(df),
            'columns': list(df.columns)
        }
    
    def _sync_api(self, config: Dict) -> Dict[str, Any]:
        """Sync data from REST API"""
        import requests
        
        response = requests.get(
            config['url'],
            headers=config.get('headers', {}),
            params=config.get('params', {})
        )
        
        data = response.json()
        
        # Flatten nested JSON if needed
        if isinstance(data, list):
            df = pd.json_normalize(data)
        else:
            df = pd.json_normalize([data])
        
        return {
            'rows': df.to_dict('records'),
            'row_count': len(df),
            'columns': list(df.columns)
        }


def main():
    """Main entry point for command line usage"""
    if len(sys.argv) < 4:
        print("Usage: python data_processor.py <file_path> <file_type> <user_id>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    file_type = sys.argv[2]
    user_id = int(sys.argv[3])
    
    processor = AcreDataProcessor()
    result = processor.process_file(file_path, file_type, user_id)
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()