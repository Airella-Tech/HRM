import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

class ApiService {
  // Base URLs for the backend microservices on localhost
  static String get _host {
    if (kIsWeb) return '127.0.0.1';
    if (defaultTargetPlatform == TargetPlatform.android) return '10.0.2.2';
    return '127.0.0.1';
  }

  static String get authBaseUrl => 'http://$_host:5004/api'; // User_Backend
  static String get employeeBaseUrl =>
      'http://$_host:5006/api'; // Employee_Backend

  static String? _token;

  // Initialize and load saved token
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
  }

  static bool get isAuthenticated => _token != null;

  // Helper to build headers
  static Map<String, String> _headers() {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  // Handle Response Parsing
  static Map<String, dynamic> _handleResponse(http.Response response) {
    final body = json.decode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    } else {
      throw Exception(
        body['message'] ??
            'An error occurred. Status code: ${response.statusCode}',
      );
    }
  }

  // Login Endpoint (User_Backend)
  static Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final url = Uri.parse('$authBaseUrl/auth/login');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'email': email, 'password': password}),
    );

    final result = _handleResponse(response);
    if (result['success'] == true) {
      final data = result['data'];
      _token = data['token'];

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', _token!);
      await prefs.setString('user', json.encode(data));
    }
    return result;
  }

  // Logout Action
  static Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
  }

  // Get Saved User Details
  static Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user');
    if (userStr != null) {
      return json.decode(userStr) as Map<String, dynamic>;
    }
    return null;
  }

  // Get Employee Profile (Employee_Backend)
  static Future<Map<String, dynamic>> getProfile() async {
    final url = Uri.parse('$employeeBaseUrl/employee/profile');
    final response = await http.get(url, headers: _headers());
    return _handleResponse(response);
  }

  // Get Attendance Today (Employee_Backend)
  static Future<Map<String, dynamic>> getTodayAttendance() async {
    final url = Uri.parse('$employeeBaseUrl/employee/attendance/today');
    final response = await http.get(url, headers: _headers());
    return _handleResponse(response);
  }

  // Clock In Action (Employee_Backend)
  static Future<Map<String, dynamic>> clockIn() async {
    final url = Uri.parse('$employeeBaseUrl/employee/attendance/clock-in');
    final response = await http.post(url, headers: _headers());
    return _handleResponse(response);
  }

  // Clock Out Action (Employee_Backend)
  static Future<Map<String, dynamic>> clockOut() async {
    final url = Uri.parse('$employeeBaseUrl/employee/attendance/clock-out');
    final response = await http.post(url, headers: _headers());
    return _handleResponse(response);
  }

  // Fetch Attendance History (Employee_Backend)
  static Future<Map<String, dynamic>> getAttendanceHistory() async {
    final url = Uri.parse('$employeeBaseUrl/employee/attendance/history');
    final response = await http.get(url, headers: _headers());
    return _handleResponse(response);
  }

  // Fetch Leave Balance (Employee_Backend)
  static Future<Map<String, dynamic>> getLeaveBalances() async {
    final url = Uri.parse('$employeeBaseUrl/employee/leave/balance');
    final response = await http.get(url, headers: _headers());
    return _handleResponse(response);
  }

  // Apply Leave (Employee_Backend)
  static Future<Map<String, dynamic>> applyLeave(
    int leaveTypeId,
    String startDate,
    String endDate,
    String reason,
  ) async {
    final url = Uri.parse('$employeeBaseUrl/employee/leave/apply');
    final response = await http.post(
      url,
      headers: _headers(),
      body: json.encode({
        'leaveTypeId': leaveTypeId,
        'startDate': startDate,
        'endDate': endDate,
        'reason': reason,
      }),
    );
    return _handleResponse(response);
  }

  // Fetch My Leave Applications (Employee_Backend)
  static Future<Map<String, dynamic>> getMyLeaves() async {
    final url = Uri.parse('$employeeBaseUrl/employee/leave');
    final response = await http.get(url, headers: _headers());
    return _handleResponse(response);
  }

  // Cancel Pending Leave (Employee_Backend)
  static Future<Map<String, dynamic>> cancelLeave(int leaveId) async {
    final url = Uri.parse('$employeeBaseUrl/employee/leave/$leaveId/cancel');
    final response = await http.post(url, headers: _headers());
    return _handleResponse(response);
  }
}
