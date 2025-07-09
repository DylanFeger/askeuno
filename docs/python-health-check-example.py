"""
Python Health Check Example
For comparison with the Node.js/Express implementation
"""

from flask import Flask, jsonify
from datetime import datetime
import time
import psutil
import os
import psycopg2
from psycopg2 import pool

app = Flask(__name__)

# Initialize database connection pool
try:
    db_pool = psycopg2.pool.SimpleConnectionPool(
        1, 20,
        os.environ.get('DATABASE_URL', 'postgresql://localhost/acre')
    )
except Exception as e:
    print(f"Failed to create connection pool: {e}")
    db_pool = None

# Application start time
START_TIME = time.time()

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for monitoring tools
    Returns 200 OK if healthy, 503 if unhealthy
    """
    start = time.time()
    
    # Check database connection
    database_status = 'connected'
    try:
        if db_pool:
            conn = db_pool.getconn()
            cursor = conn.cursor()
            cursor.execute('SELECT 1')
            cursor.close()
            db_pool.putconn(conn)
        else:
            database_status = 'disconnected'
    except Exception as e:
        database_status = 'error'
        app.logger.error(f"Database health check failed: {e}")
        
        return jsonify({
            'status': 'unhealthy',
            'message': 'Database connection failed',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'uptime': time.time() - START_TIME,
            'environment': os.environ.get('FLASK_ENV', 'development'),
            'error': 'Database unavailable'
        }), 503
    
    # Calculate response time
    response_time = (time.time() - start) * 1000  # Convert to milliseconds
    
    # Return healthy response
    return jsonify({
        'status': 'healthy',
        'message': 'Acre API is running',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'uptime': time.time() - START_TIME,
        'environment': os.environ.get('FLASK_ENV', 'development'),
        'version': '1.0.0',
        'database': database_status,
        'responseTime': f'{response_time:.2f}ms'
    }), 200

@app.route('/health/detailed', methods=['GET'])
def detailed_health_check():
    """
    Detailed health check with system metrics
    Can be used for internal monitoring
    """
    start = time.time()
    
    # Get system metrics
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Check all services
    services = {
        'database': check_database(),
        'redis': check_redis(),
        'external_api': check_external_api()
    }
    
    # Overall health status
    all_healthy = all(services.values())
    
    response_time = (time.time() - start) * 1000
    
    return jsonify({
        'status': 'healthy' if all_healthy else 'degraded',
        'message': 'Acre API detailed health check',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'uptime': time.time() - START_TIME,
        'environment': os.environ.get('FLASK_ENV', 'development'),
        'version': '1.0.0',
        'services': services,
        'metrics': {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_available_mb': memory.available / 1024 / 1024,
            'disk_percent': disk.percent,
            'disk_free_gb': disk.free / 1024 / 1024 / 1024
        },
        'responseTime': f'{response_time:.2f}ms'
    }), 200 if all_healthy else 503

def check_database():
    """Check database connectivity"""
    try:
        if db_pool:
            conn = db_pool.getconn()
            cursor = conn.cursor()
            cursor.execute('SELECT 1')
            cursor.close()
            db_pool.putconn(conn)
            return True
    except:
        return False
    return False

def check_redis():
    """Check Redis connectivity (example)"""
    # In a real implementation, check actual Redis connection
    # import redis
    # try:
    #     r = redis.Redis(host='localhost', port=6379)
    #     r.ping()
    #     return True
    # except:
    #     return False
    return True  # Mock for example

def check_external_api():
    """Check external API availability (example)"""
    # In a real implementation, check actual API
    # import requests
    # try:
    #     response = requests.get('https://api.example.com/status', timeout=5)
    #     return response.status_code == 200
    # except:
    #     return False
    return True  # Mock for example

# FastAPI Alternative
"""
from fastapi import FastAPI, Response
from datetime import datetime
import time
import asyncpg

app = FastAPI()

# Database connection pool
db_pool = None

@app.on_event("startup")
async def startup():
    global db_pool
    db_pool = await asyncpg.create_pool(
        os.environ.get('DATABASE_URL', 'postgresql://localhost/acre')
    )

@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        await db_pool.close()

@app.get("/health")
async def health_check(response: Response):
    start = time.time()
    
    # Check database
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval('SELECT 1')
        database_status = 'connected'
    except Exception as e:
        database_status = 'disconnected'
        response.status_code = 503
        return {
            'status': 'unhealthy',
            'message': 'Database connection failed',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'uptime': time.time() - START_TIME,
            'environment': os.environ.get('ENV', 'development'),
            'error': str(e)
        }
    
    response_time = (time.time() - start) * 1000
    
    return {
        'status': 'healthy',
        'message': 'Acre API is running',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'uptime': time.time() - START_TIME,
        'environment': os.environ.get('ENV', 'development'),
        'version': '1.0.0',
        'database': database_status,
        'responseTime': f'{response_time:.2f}ms'
    }
"""

# Django Alternative
"""
from django.http import JsonResponse
from django.views import View
from django.db import connection
from datetime import datetime
import time

class HealthCheckView(View):
    def get(self, request):
        start = time.time()
        
        # Check database
        database_status = 'connected'
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            database_status = 'disconnected'
            return JsonResponse({
                'status': 'unhealthy',
                'message': 'Database connection failed',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'uptime': time.time() - settings.START_TIME,
                'environment': settings.ENVIRONMENT,
                'error': str(e)
            }, status=503)
        
        response_time = (time.time() - start) * 1000
        
        return JsonResponse({
            'status': 'healthy',
            'message': 'Acre API is running',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'uptime': time.time() - settings.START_TIME,
            'environment': settings.ENVIRONMENT,
            'version': '1.0.0',
            'database': database_status,
            'responseTime': f'{response_time:.2f}ms'
        })
        
# urls.py
from django.urls import path
from .views import HealthCheckView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health_check'),
]
"""

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)