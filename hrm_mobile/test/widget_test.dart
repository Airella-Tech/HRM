// Smoke test: the app boots to the login screen when no session is stored.

import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_application_1/main.dart';

void main() {
  testWidgets('shows the login screen when signed out', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MyApp());
    await tester.pump();

    expect(find.text('HRM Employee Portal'), findsOneWidget);
  });
}
