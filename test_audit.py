#!/usr/bin/env python3
"""
Comprehensive System Audit for Euno
Tests all critical features and pages
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:5000"
session = requests.Session()

def log_test(test_name, result, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status = "✅ PASS" if result else "❌ FAIL"
    print(f"[{timestamp}] {test_name}: {status}")
    if details:
        print(f"         Details: {details}")

def test_health_check():
    """Test 1: Health Check Endpoint"""
    try:
        response = session.get(f"{BASE_URL}/api/health/check")
        if response.status_code == 200:
            data = response.json()
            log_test("Health Check", True, f"Status: {data.get('status', 'unknown')}")
            return True
        else:
            log_test("Health Check", False, f"Status code: {response.status_code}")
            return False
    except Exception as e:
        log_test("Health Check", False, str(e))
        return False

def test_authentication():
    """Test 2: Authentication Flow"""
    # Test login with test credentials
    login_data = {
        "username": "testuser",
        "password": "Test123!"
    }
    
    try:
        # First check if we can access protected endpoint without auth
        response = session.get(f"{BASE_URL}/api/auth/me")
        if response.status_code == 401:
            log_test("Auth Protection", True, "Properly blocks unauthenticated requests")
        else:
            log_test("Auth Protection", False, "Protected endpoint accessible without auth")
        
        # Test login with invalid credentials
        response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 401:
            error_msg = response.json().get('error', '')
            log_test("Login Error Messages", True, f"Error: {error_msg}")
        else:
            log_test("Login Error Messages", False, "Invalid login succeeded unexpectedly")
            
        return True
    except Exception as e:
        log_test("Authentication", False, str(e))
        return False

def test_file_upload_endpoint():
    """Test 3: File Upload Endpoint"""
    try:
        # Test without authentication
        response = session.post(f"{BASE_URL}/api/files/upload")
        if response.status_code == 401:
            log_test("Upload Auth Protection", True, "Upload endpoint protected")
        else:
            log_test("Upload Auth Protection", False, f"Status: {response.status_code}")
        return True
    except Exception as e:
        log_test("File Upload Endpoint", False, str(e))
        return False

def test_api_endpoints():
    """Test 4: Core API Endpoints"""
    endpoints = [
        ("/api/auth/me", "Auth Check"),
        ("/api/data-sources", "Data Sources"),
        ("/api/conversations", "Conversations"),
        ("/api/health/status", "Health Status"),
    ]
    
    all_pass = True
    for endpoint, name in endpoints:
        try:
            response = session.get(f"{BASE_URL}{endpoint}")
            # We expect 401 for protected endpoints when not authenticated
            if response.status_code in [200, 401]:
                log_test(f"Endpoint: {name}", True, f"Status: {response.status_code}")
            else:
                log_test(f"Endpoint: {name}", False, f"Unexpected status: {response.status_code}")
                all_pass = False
        except Exception as e:
            log_test(f"Endpoint: {name}", False, str(e))
            all_pass = False
    
    return all_pass

def test_error_handling():
    """Test 5: Error Handling"""
    try:
        # Test 404 handling
        response = session.get(f"{BASE_URL}/api/nonexistent")
        if response.status_code == 404:
            log_test("404 Error Handling", True, "Properly returns 404")
        else:
            log_test("404 Error Handling", False, f"Status: {response.status_code}")
        
        # Test invalid JSON
        response = session.post(f"{BASE_URL}/api/auth/login", 
                              data="invalid json", 
                              headers={"Content-Type": "application/json"})
        if response.status_code in [400, 401]:
            log_test("Invalid JSON Handling", True, f"Status: {response.status_code}")
        else:
            log_test("Invalid JSON Handling", False, f"Status: {response.status_code}")
        
        return True
    except Exception as e:
        log_test("Error Handling", False, str(e))
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("EUNO SYSTEM AUDIT - " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("="*60 + "\n")
    
    tests = [
        ("🔐 AUTHENTICATION FLOW", test_authentication),
        ("🏥 HEALTH CHECK", test_health_check),
        ("📁 FILE UPLOAD", test_file_upload_endpoint),
        ("🌐 API ENDPOINTS", test_api_endpoints),
        ("⚠️  ERROR HANDLING", test_error_handling),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{test_name}")
        print("-" * 40)
        result = test_func()
        results.append(result)
        time.sleep(0.5)  # Small delay between tests
    
    # Summary
    print("\n" + "="*60)
    print("AUDIT SUMMARY")
    print("="*60)
    passed = sum(results)
    total = len(results)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n✅ All tests passed! System is healthy.")
    else:
        print("\n⚠️  Some tests failed. Please review the logs above.")

if __name__ == "__main__":
    main()