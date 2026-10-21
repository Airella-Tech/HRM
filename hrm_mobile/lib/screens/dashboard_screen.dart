import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'attendance_screen.dart';
import 'leave_screen.dart';
import 'profile_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _user;
  bool _isLoading = true;
  String? _errorMessage;

  // Stats values
  int _presentDays = 0;
  double _leaveBalance = 0.0;
  int _pendingLeaves = 0;
  final String _lastSalary = '0.00';

  // Clock status
  bool _isClockedIn = false;
  String? _clockInTime;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // 1. Get saved user info
      final savedUser = await ApiService.getSavedUser();
      if (savedUser != null) {
        setState(() {
          _user = savedUser;
        });
      }

      // 2. Fetch fresh profile and stats from backend
      final profileResult = await ApiService.getProfile();
      if (profileResult['success'] == true) {
        setState(() {
          _user = profileResult['data'];
        });
      }

      // 3. Fetch today's attendance to see clock status
      final todayAtt = await ApiService.getTodayAttendance();
      if (todayAtt['success'] == true && todayAtt['data'] != null) {
        final data = todayAtt['data'];
        setState(() {
          _isClockedIn =
              data['clockInTime'] != null && data['clockOutTime'] == null;
          _clockInTime = data['clockInTime'];
        });
      }

      // 4. Fetch leave balances to calculate stats
      final leaveBalResult = await ApiService.getLeaveBalances();
      if (leaveBalResult['success'] == true && leaveBalResult['data'] != null) {
        final list = leaveBalResult['data'] as List;
        double balance = 0.0;
        for (var item in list) {
          balance += (item['balance'] ?? 0.0);
        }
        setState(() {
          _leaveBalance = balance;
        });
      }

      // 5. Fetch leave history for pending leaves count
      final leavesResult = await ApiService.getMyLeaves();
      if (leavesResult['success'] == true && leavesResult['data'] != null) {
        final list = leavesResult['data'] as List;
        final pending = list
            .where((item) => item['status'] == 'PENDING')
            .length;
        setState(() {
          _pendingLeaves = pending;
        });
      }

      // 6. Fetch attendance history for present days count this month
      final attendanceResult = await ApiService.getAttendanceHistory();
      if (attendanceResult['success'] == true &&
          attendanceResult['data'] != null) {
        final list = attendanceResult['data'] as List;
        final thisMonth = DateTime.now().month;
        final presentCount = list.where((item) {
          if (item['clockInTime'] == null) return false;
          try {
            final date = DateTime.parse(item['date']);
            return date.month == thisMonth;
          } catch (_) {
            return false;
          }
        }).length;

        setState(() {
          _presentDays = presentCount;
        });
      }
    } catch (e) {
      // Keep offline defaults or show warning
      debugPrint('Error loading dashboard stats: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleClockInOut() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final Map<String, dynamic> result;
      if (_isClockedIn) {
        result = await ApiService.clockOut();
      } else {
        result = await ApiService.clockIn();
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Action successful'),
            backgroundColor: Colors.green[700],
          ),
        );
        _loadInitialData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception:', '').trim()),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  Widget _buildOverviewTab() {
    if (_user == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final fullName = _user!['fullName'] ?? 'Employee';
    final designation = _user!['designation'] ?? 'Staff Member';
    final employeeId = _user!['employeeId']?.toString() ?? 'EMP';

    return RefreshIndicator(
      onRefresh: _loadInitialData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Welcome Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF3F51B5), Color(0xFF673AB7)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.blue.withOpacity(0.2),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome back,',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withOpacity(0.8),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    fullName,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$designation • ID: $employeeId',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.white.withOpacity(0.9),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Today's Clock In Status Card
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: _isClockedIn
                              ? Colors.green[100]
                              : Colors.amber[100],
                          child: Icon(
                            Icons.timer_outlined,
                            color: _isClockedIn
                                ? Colors.green[800]
                                : Colors.amber[800],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Today's Attendance Status",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _isClockedIn
                                    ? 'Clocked in at ${_formatTime(_clockInTime)}'
                                    : 'You are currently Clocked Out',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _isLoading ? null : _handleClockInOut,
                      icon: Icon(
                        _isClockedIn
                            ? Icons.login_outlined
                            : Icons.logout_outlined,
                      ),
                      label: Text(_isClockedIn ? 'Clock Out' : 'Clock In'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isClockedIn
                            ? Colors.orange[800]
                            : const Color(0xFF3F51B5),
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 48),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Statistics Grid (2 columns)
            const Text(
              'Statistics Overview',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.4,
              children: [
                _buildStatCard(
                  'Present Days',
                  '$_presentDays',
                  'This month',
                  const Color(0xFF3F51B5),
                  Icons.check_circle_outline,
                ),
                _buildStatCard(
                  'Leave Balance',
                  _leaveBalance.toStringAsFixed(1),
                  'Days available',
                  Colors.green[700]!,
                  Icons.calendar_today_outlined,
                ),
                _buildStatCard(
                  'Pending Leaves',
                  '$_pendingLeaves',
                  'Awaiting review',
                  Colors.amber[800]!,
                  Icons.pending_actions_outlined,
                ),
                _buildStatCard(
                  'Last Salary',
                  'Rs. $_lastSalary',
                  'Base compensation',
                  Colors.purple[700]!,
                  Icons.monetization_on_outlined,
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Quick Actions Segment
            const Text(
              'Quick Actions',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildQuickActionButton(
                    'Apply Leave',
                    Icons.add_moderator_outlined,
                    Colors.green,
                    () => setState(
                      () => _currentIndex = 2,
                    ), // Switch to Leave tab
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildQuickActionButton(
                    'My Profile',
                    Icons.person_search_outlined,
                    Colors.blue,
                    () => setState(
                      () => _currentIndex = 3,
                    ), // Switch to Profile tab
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    String subText,
    Color color,
    IconData icon,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              Icon(icon, color: color, size: 20),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subText,
                style: TextStyle(fontSize: 10, color: Colors.grey[500]),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionButton(
    String label,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(String? timeStr) {
    if (timeStr == null) return '--:--';
    final parts = timeStr.split(':');
    if (parts.length >= 2) {
      return '${parts[0]}:${parts[1]}';
    }
    return timeStr;
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> tabs = [
      _buildOverviewTab(),
      const AttendanceScreen(),
      const LeaveScreen(),
      const ProfileScreen(),
    ];

    final List<String> titles = [
      'Employee Dashboard',
      'My Attendance',
      'Leave Management',
      'Employee Profile',
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(
          titles[_currentIndex],
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF3F51B5),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadInitialData,
          ),
        ],
      ),
      body: _isLoading && _user == null
          ? const Center(child: CircularProgressIndicator())
          : tabs[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onTabTapped,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF3F51B5),
        unselectedItemColor: Colors.grey[500],
        showUnselectedLabels: true,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Overview',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.timer_outlined),
            activeIcon: Icon(Icons.timer),
            label: 'Attendance',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.date_range_outlined),
            activeIcon: Icon(Icons.date_range),
            label: 'Leaves',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
