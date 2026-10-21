import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final savedUser = await ApiService.getSavedUser();
      if (savedUser != null) {
        setState(() {
          _user = savedUser;
        });
      }

      final freshProfile = await ApiService.getProfile();
      if (freshProfile['success'] == true) {
        setState(() {
          _user = freshProfile['data'];
        });
      }
    } catch (e) {
      debugPrint('Error fetching profile: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleLogout() async {
    await ApiService.logout();
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final dt = DateTime.parse(dateStr);
      final months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _user == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final userObj = _user ?? {};
    final fullName = userObj['fullName'] ?? 'Employee';
    final designation = userObj['designation'] ?? 'Staff Member';
    final employeeId = userObj['employeeId']?.toString() ?? 'N/A';
    final email = userObj['email'] ?? 'N/A';
    final phone = userObj['phone'] ?? 'N/A';
    final role = userObj['role'] ?? 'EMPLOYEE';
    final departmentName =
        userObj['department'] != null && userObj['department']['name'] != null
        ? userObj['department']['name']
        : 'IT Department';
    final joiningDate = userObj['joiningDate'] ?? userObj['hireDate'];

    return RefreshIndicator(
      onRefresh: _fetchProfile,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Avatar Header Card
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: const Color(0xFF3F51B5),
                    child: Text(
                      fullName.isNotEmpty
                          ? fullName.substring(0, 1).toUpperCase()
                          : 'E',
                      style: const TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    fullName,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    designation,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Chip(
                    label: Text(role),
                    backgroundColor: const Color(
                      0xFF3F51B5,
                    ).withValues(alpha: 0.1),
                    labelStyle: const TextStyle(
                      color: Color(0xFF3F51B5),
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Profile details card
            const Text(
              'Personal Information',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    _buildInfoRow(
                      Icons.badge_outlined,
                      'Employee ID',
                      employeeId,
                    ),
                    const Divider(height: 24),
                    _buildInfoRow(Icons.email_outlined, 'Email Address', email),
                    const Divider(height: 24),
                    _buildInfoRow(Icons.phone_outlined, 'Phone Number', phone),
                    const Divider(height: 24),
                    _buildInfoRow(
                      Icons.business_outlined,
                      'Department',
                      departmentName,
                    ),
                    const Divider(height: 24),
                    _buildInfoRow(
                      Icons.calendar_month_outlined,
                      'Joining Date',
                      _formatDate(joiningDate),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Logout Action Button
            ElevatedButton.icon(
              onPressed: _handleLogout,
              icon: const Icon(Icons.logout),
              label: const Text(
                'LOG OUT',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red[800],
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 2,
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFF3F51B5), size: 22),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Colors.black87,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
