import 'package:flutter/material.dart';

import '../services/api_service.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  bool _isLoading = true;
  bool _isClockedIn = false;
  String? _clockInTime;
  String? _clockOutTime;
  List<dynamic> _history = [];

  @override
  void initState() {
    super.initState();
    _fetchAttendanceData();
  }

  Future<void> _fetchAttendanceData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // 1. Get today's attendance status
      final todayResult = await ApiService.getTodayAttendance();
      if (todayResult['success'] == true && todayResult['data'] != null) {
        final data = todayResult['data'];
        setState(() {
          _isClockedIn =
              data['clockInTime'] != null && data['clockOutTime'] == null;
          _clockInTime = data['clockInTime'];
          _clockOutTime = data['clockOutTime'];
        });
      } else {
        setState(() {
          _isClockedIn = false;
          _clockInTime = null;
          _clockOutTime = null;
        });
      }

      final historyResult = await ApiService.getAttendanceHistory();
      if (historyResult['success'] == true && historyResult['data'] != null) {
        setState(() {
          _history = historyResult['data'] as List;
          // Sort by date descending
          _history.sort((a, b) {
            final aTime = a['date'] ?? '';
            final bTime = b['date'] ?? '';
            return bTime.compareTo(aTime);
          });
        });
      }
    } catch (e) {
      debugPrint('Error loading attendance logs: $e');
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
            content: Text(result['message'] ?? 'Successfully updated'),
            backgroundColor: Colors.green[700],
          ),
        );
        _fetchAttendanceData();
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

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '-';
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
      return '${dt.day.toString().padLeft(2, '0')} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return dateStr;
    }
  }

  String _formatTime(String? timeStr) {
    if (timeStr == null) return '--:--';
    // timeStr is usually "HH:mm:ss"
    final parts = timeStr.split(':');
    if (parts.length >= 2) {
      return '${parts[0]}:${parts[1]}';
    }
    return timeStr;
  }

  String _calculateDuration(
    String? dateStr,
    String? startTimeStr,
    String? endTimeStr,
  ) {
    if (dateStr == null || startTimeStr == null) return '0h 0m';
    try {
      final startTime = DateTime.parse('${dateStr}T$startTimeStr');
      final endTime = endTimeStr != null
          ? DateTime.parse('${dateStr}T$endTimeStr')
          : DateTime.now();
      final diff = endTime.difference(startTime);
      final hours = diff.inHours;
      final minutes = diff.inMinutes % 60;
      return '${hours}h ${minutes}m';
    } catch (_) {
      return '0h 0m';
    }
  }

  @override
  Widget build(BuildContext context) {
    return _isLoading && _history.isEmpty
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _fetchAttendanceData,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Clock In/Out card
                  Card(
                    elevation: 4,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        children: [
                          Text(
                            _isClockedIn
                                ? 'YOU ARE CLOCKED IN'
                                : 'YOU ARE CLOCKED OUT',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: _isClockedIn
                                  ? Colors.green[800]
                                  : Colors.amber[800],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isClockedIn
                                ? 'Active Shift Started At: ${_formatTime(_clockInTime)}'
                                : 'Start your workday by clocking in',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Column(
                                children: [
                                  Text(
                                    _formatTime(_clockInTime),
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Clock In',
                                    style: TextStyle(
                                      color: Colors.grey[500],
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 24),
                                child: Icon(
                                  Icons.arrow_forward,
                                  color: Colors.grey,
                                ),
                              ),
                              Column(
                                children: [
                                  Text(
                                    _formatTime(_clockOutTime),
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Clock Out',
                                    style: TextStyle(
                                      color: Colors.grey[500],
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: _isLoading ? null : _handleClockInOut,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _isClockedIn
                                  ? Colors.orange[800]
                                  : const Color(0xFF3F51B5),
                              foregroundColor: Colors.white,
                              minimumSize: const Size(double.infinity, 50),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : Text(
                                    _isClockedIn ? 'CLOCK OUT' : 'CLOCK IN',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // History Header
                  const Text(
                    'Attendance Logs',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),

                  // History List
                  if (_history.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey[200]!),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.history,
                            size: 48,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No logs found for the last 30 days',
                            style: TextStyle(
                              color: Colors.grey[500],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _history.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final log = _history[index];
                        final dateStr = log['date'];
                        final clockIn = log['clockInTime'];
                        final clockOut = log['clockOutTime'];
                        final hasClockedOut = clockOut != null;

                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.grey.withValues(alpha: 0.05),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ],
                            border: Border.all(color: Colors.grey[200]!),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _formatDate(dateStr),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.login,
                                        size: 12,
                                        color: Colors.green[700],
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        _formatTime(clockIn),
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Icon(
                                        Icons.logout,
                                        size: 12,
                                        color: hasClockedOut
                                            ? Colors.red[700]
                                            : Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        hasClockedOut
                                            ? _formatTime(clockOut)
                                            : '--:--',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: hasClockedOut
                                      ? Colors.green[50]
                                      : Colors.orange[50],
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  _calculateDuration(
                                    dateStr,
                                    clockIn,
                                    clockOut,
                                  ),
                                  style: TextStyle(
                                    color: hasClockedOut
                                        ? Colors.green[800]
                                        : Colors.orange[800],
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
          );
  }
}
